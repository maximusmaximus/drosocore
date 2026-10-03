#!/usr/bin/env python3
"""Assemble the Janelia/DeepMind flybody OBJs into a web GLB.

Source: google-deepmind/mujoco_menagerie flybody (Apache-2.0), originally
TuragaLab/flybody — Vaxenburg et al., bioRxiv 2024.
"""

from __future__ import annotations

import json
import math
import struct
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

SRC = Path("/tmp/flybody-repo/flybody")
XML = SRC / "fruitfly.xml"
ASSETS = SRC / "assets"
OUT = Path("/workspace/public/models/drosophila.glb")

MESH_SCALE = 0.1
# Old procedural fly is ~0.5 local units long; flybody is ~0.25 cm.
MODEL_SCALE = 1.85
# Plant tarsi at the same local foot depth the sim already uses.
FOOT_Y = -0.24

# MuJoCo (X forward, Z up) -> three.js (Z forward, Y up): (x,y,z) -> (-y, z, x)
M = ((0.0, -1.0, 0.0), (0.0, 0.0, 1.0), (1.0, 0.0, 0.0))
MT = ((0.0, 0.0, 1.0), (-1.0, 0.0, 0.0), (0.0, 1.0, 0.0))

MATERIALS = {
    "body": (0.02, 0.02, 0.022, 1.0, 0.88, 0.0, False),
    "red": (0.76, 0.09, 0.04, 1.0, 0.18, 0.02, False),
    "ocelli": (0.04, 0.03, 0.025, 1.0, 0.22, 0.04, False),
    "black": (0.012, 0.012, 0.014, 1.0, 0.9, 0.0, False),
    "bristle-brown": (0.03, 0.022, 0.016, 1.0, 0.85, 0.0, False),
    "lower": (0.045, 0.038, 0.03, 1.0, 0.86, 0.0, False),
    "brown": (0.025, 0.02, 0.016, 1.0, 0.86, 0.0, False),
    "membrane": (0.72, 0.82, 0.88, 0.38, 0.16, 0.0, True),
}

MAT_INDEX = {name: i for i, name in enumerate(MATERIALS)}


def vadd(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def vsub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def vscale(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def vdot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def vcross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def vnorm(a):
    n = math.sqrt(vdot(a, a)) or 1.0
    return vscale(a, 1.0 / n)


def mat_mul_vec(m, v):
    return (
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
    )


def mat_mul(a, b):
    return tuple(tuple(sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)) for i in range(3))


def quat_to_mat(q):
    w, x, y, z = q
    return (
        (1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)),
        (2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)),
        (2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)),
    )


def mat_to_quat(m):
    t = m[0][0] + m[1][1] + m[2][2]
    if t > 0:
        s = 0.5 / math.sqrt(t + 1)
        w = 0.25 / s
        x = (m[2][1] - m[1][2]) * s
        y = (m[0][2] - m[2][0]) * s
        z = (m[1][0] - m[0][1]) * s
    elif m[0][0] > m[1][1] and m[0][0] > m[2][2]:
        s = 2 * math.sqrt(1 + m[0][0] - m[1][1] - m[2][2])
        w = (m[2][1] - m[1][2]) / s
        x = 0.25 * s
        y = (m[0][1] + m[1][0]) / s
        z = (m[0][2] + m[2][0]) / s
    elif m[1][1] > m[2][2]:
        s = 2 * math.sqrt(1 + m[1][1] - m[0][0] - m[2][2])
        w = (m[0][2] - m[2][0]) / s
        x = (m[0][1] + m[1][0]) / s
        y = 0.25 * s
        z = (m[1][2] + m[2][1]) / s
    else:
        s = 2 * math.sqrt(1 + m[2][2] - m[0][0] - m[1][1])
        w = (m[1][0] - m[0][1]) / s
        x = (m[0][2] + m[2][0]) / s
        y = (m[1][2] + m[2][1]) / s
        z = 0.25 * s
    n = math.sqrt(w * w + x * x + y * y + z * z) or 1.0
    return (w / n, x / n, y / n, z / n)


def convert_pos(p):
    return mat_mul_vec(M, p)


def convert_quat(q):
    r = quat_to_mat(q)
    return mat_to_quat(mat_mul(M, mat_mul(r, MT)))


def parse_vec(s, n, default):
    if not s:
        return default
    parts = [float(x) for x in s.split()]
    while len(parts) < n:
        parts.append(default[len(parts)])
    return tuple(parts[:n])


def parse_obj(path: Path):
    verts: list[tuple[float, float, float]] = []
    norms: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int]] = []
    fnorms: list[tuple[int, int, int]] = []
    with path.open() as f:
        for line in f:
            if line.startswith("v "):
                _, x, y, z = line.split()[:4]
                verts.append((float(x) * MESH_SCALE, float(y) * MESH_SCALE, float(z) * MESH_SCALE))
            elif line.startswith("vn "):
                _, x, y, z = line.split()[:4]
                norms.append((float(x), float(y), float(z)))
            elif line.startswith("f "):
                bits = line.split()[1:4]
                vi = []
                ni = []
                for b in bits:
                    sp = b.split("/")
                    vi.append(int(sp[0]) - 1)
                    ni.append(int(sp[2]) - 1 if len(sp) > 2 and sp[2] else int(sp[0]) - 1)
                faces.append((vi[0], vi[1], vi[2]))
                fnorms.append((ni[0], ni[1], ni[2]))
    return verts, norms, faces, fnorms


SKIP_MESH = {
    "thorax_black",
    "head_black",
    "head_ocelli",
    "rostrum_bristle-brown",
    "haustellum_black",
    "antenna_left_black",
    "antenna_right_black",
    "tarsus_T1_2_left",
    "tarsus_T1_3_left",
    "tarsus_T1_4_left",
    "tarsus_T1_2_right",
    "tarsus_T1_3_right",
    "tarsus_T1_4_right",
    "tarsus_T2_2_left",
    "tarsus_T2_3_left",
    "tarsus_T2_4_left",
    "tarsus_T2_2_right",
    "tarsus_T2_3_right",
    "tarsus_T2_4_right",
    "tarsus_T3_2_left",
    "tarsus_T3_3_left",
    "tarsus_T3_4_left",
    "tarsus_T3_2_right",
    "tarsus_T3_3_right",
    "tarsus_T3_4_right",
}


def target_faces_for(mesh_name: str, nfaces: int) -> int:
    if nfaces <= 280:
        return nfaces
    if mesh_name == "head_red":
        return min(nfaces, 2800)
    if mesh_name in ("thorax", "head"):
        return min(nfaces, 1100)
    if "wing" in mesh_name and "membrane" in mesh_name:
        return min(nfaces, 280)
    if "wing" in mesh_name:
        return min(nfaces, 400)
    if "antenna" in mesh_name:
        return min(nfaces, 350)
    if mesh_name.startswith("femur") or mesh_name.startswith("coxa"):
        return min(nfaces, 320)
    if mesh_name.startswith("tibia") or mesh_name.startswith("tarsus") or mesh_name.startswith("tarsal"):
        return min(nfaces, 220)
    if mesh_name.startswith("abdomen"):
        return min(nfaces, 280)
    if "haltere" in mesh_name or "rostrum" in mesh_name or "haustellum" in mesh_name:
        return min(nfaces, 280)
    return min(nfaces, 320)


def cluster_grid(verts, acc_n, faces, cell: float):
    cb: dict[tuple[int, int, int], list[int]] = defaultdict(list)
    for i, (x, y, z) in enumerate(verts):
        cb[(math.floor(x / cell), math.floor(y / cell), math.floor(z / cell))].append(i)
    remap = [0] * len(verts)
    cv: list[tuple[float, float, float]] = []
    cn: list[list[float]] = []
    for idxs in cb.values():
        cx = cy = cz = nx = ny = nz = 0.0
        for i in idxs:
            vx, vy, vz = verts[i]
            cx += vx
            cy += vy
            cz += vz
            nx += acc_n[i][0]
            ny += acc_n[i][1]
            nz += acc_n[i][2]
        inv = 1.0 / len(idxs)
        j = len(cv)
        cv.append((cx * inv, cy * inv, cz * inv))
        cn.append([nx, ny, nz])
        for i in idxs:
            remap[i] = j
    faces2 = []
    seen = set()
    for a, b, c in faces:
        ia, ib, ic = remap[a], remap[b], remap[c]
        if ia == ib or ib == ic or ia == ic:
            continue
        tri = (ia, ib, ic)
        if tri in seen:
            continue
        seen.add(tri)
        faces2.append(tri)
    return cv, cn, faces2


def weld_and_cluster(verts, norms, faces, fnorms, target_faces: int):
    """Weld coincident verts, then grid-cluster down to the face budget."""
    buckets: dict[tuple[int, int, int], list[int]] = defaultdict(list)
    q = 1e5
    for i, (x, y, z) in enumerate(verts):
        buckets[(round(x * q), round(y * q), round(z * q))].append(i)

    remap = [0] * len(verts)
    out_v: list[tuple[float, float, float]] = []
    for idxs in buckets.values():
        cx = cy = cz = 0.0
        for i in idxs:
            vx, vy, vz = verts[i]
            cx += vx
            cy += vy
            cz += vz
        inv = 1.0 / len(idxs)
        j = len(out_v)
        out_v.append((cx * inv, cy * inv, cz * inv))
        for i in idxs:
            remap[i] = j

    new_faces: list[tuple[int, int, int]] = []
    acc_n = [[0.0, 0.0, 0.0] for _ in out_v]
    for (a, b, c), (na, nb, nc) in zip(faces, fnorms):
        ia, ib, ic = remap[a], remap[b], remap[c]
        if ia == ib or ib == ic or ia == ic:
            continue
        new_faces.append((ia, ib, ic))
        for i, ni in ((ia, na), (ib, nb), (ic, nc)):
            if 0 <= ni < len(norms):
                nx, ny, nz = norms[ni]
                acc_n[i][0] += nx
                acc_n[i][1] += ny
                acc_n[i][2] += nz

    if len(new_faces) > target_faces and target_faces > 32 and out_v:
        xs = [v[0] for v in out_v]
        ys = [v[1] for v in out_v]
        zs = [v[2] for v in out_v]
        diag = math.sqrt((max(xs) - min(xs)) ** 2 + (max(ys) - min(ys)) ** 2 + (max(zs) - min(zs)) ** 2) or 1e-4
        lo, hi = diag / 400.0, diag / 4.0
        best = (out_v, acc_n, new_faces)
        for _ in range(10):
            mid = (lo + hi) * 0.5
            cv, cn, cf = cluster_grid(out_v, acc_n, new_faces, mid)
            if len(cf) > target_faces:
                lo = mid
                best = (cv, cn, cf)
            else:
                hi = mid
                best = (cv, cn, cf)
                if abs(len(cf) - target_faces) < max(20, target_faces * 0.08):
                    break
        out_v, acc_n, new_faces = best

    out_n = []
    for nx, ny, nz in acc_n:
        l = math.sqrt(nx * nx + ny * ny + nz * nz)
        if l < 1e-8:
            out_n.append((0.0, 1.0, 0.0))
        else:
            out_n.append((nx / l, ny / l, nz / l))
    return out_v, out_n, new_faces


class Xform:
    __slots__ = ("p", "q")

    def __init__(self, p=(0.0, 0.0, 0.0), q=(1.0, 0.0, 0.0, 0.0)):
        self.p = p
        self.q = q

    def mat(self):
        return quat_to_mat(self.q)

    def apply(self, v):
        return vadd(self.p, mat_mul_vec(self.mat(), v))

    def apply_n(self, n):
        return vnorm(mat_mul_vec(self.mat(), n))

    def compose(self, child: "Xform") -> "Xform":
        return Xform(self.apply(child.p), mat_to_quat(mat_mul(self.mat(), child.mat())))

    def inverse(self) -> "Xform":
        r = self.mat()
        rt = tuple(tuple(r[j][i] for j in range(3)) for i in range(3))
        q = mat_to_quat(rt)
        p = mat_mul_vec(rt, vscale(self.p, -1.0))
        return Xform(p, q)


def parse_xml():
    root = ET.parse(XML).getroot()
    mesh_file = {}
    for m in root.findall("asset/mesh"):
        mesh_file[m.attrib["name"]] = m.attrib["file"]

    class_material = {}
    for d in root.iter("default"):
        cls = d.attrib.get("class")
        geom = d.find("geom")
        if cls and geom is not None and "material" in geom.attrib:
            class_material[cls] = geom.attrib["material"]

    world = root.find("worldbody")
    bodies = []

    def walk(el, parent):
        if el.tag != "body":
            return
        name = el.attrib["name"]
        pos = parse_vec(el.attrib.get("pos"), 3, (0.0, 0.0, 0.0))
        quat = parse_vec(el.attrib.get("quat"), 4, (1.0, 0.0, 0.0, 0.0))
        childclass = el.attrib.get("childclass")
        body = {
            "name": name,
            "parent": parent,
            "pos": pos,
            "quat": quat,
            "geoms": [],
        }
        bodies.append(body)
        for g in el.findall("geom"):
            gclass = g.attrib.get("class", "")
            if "collision" in gclass:
                continue
            if g.attrib.get("group") in ("4", "5"):
                continue
            mesh = g.attrib.get("mesh")
            if not mesh:
                continue
            mat = g.attrib.get("material")
            if not mat:
                mat = class_material.get(gclass) or class_material.get(childclass) or "body"
            body["geoms"].append(
                {
                    "mesh": mesh,
                    "file": mesh_file[mesh],
                    "material": mat,
                    "pos": parse_vec(g.attrib.get("pos"), 3, (0.0, 0.0, 0.0)),
                    "quat": parse_vec(g.attrib.get("quat"), 4, (1.0, 0.0, 0.0, 0.0)),
                }
            )
        for child in el:
            if child.tag == "body":
                walk(child, name)

    for c in world:
        if c.tag == "body":
            walk(c, None)
    return bodies


def bucket_of(name: str) -> str:
    if name == "thorax":
        return "Thorax"
    if name in ("head", "rostrum", "haustellum") or name.startswith("labrum"):
        return "Head"
    if name == "antenna_left":
        return "AntL"
    if name == "antenna_right":
        return "AntR"
    if name.startswith("abdomen"):
        return "Abdomen"
    if name == "wing_left":
        return "WingL"
    if name == "wing_right":
        return "WingR"
    if name == "haltere_left":
        return "HaltL"
    if name == "haltere_right":
        return "HaltR"
    for side in ("left", "right"):
        for t in ("T1", "T2", "T3"):
            tail = f"_{t}_{side}"
            if name == f"coxa{tail}":
                return f"Coxa_{t}_{side}"
            if name == f"femur{tail}":
                return f"Femur_{t}_{side}"
            if name == f"tibia{tail}" or name == f"claw{tail}" or name.startswith("tarsus") and name.endswith(tail):
                return f"Tibia_{t}_{side}"
    return "Thorax"


def joint_body_for_bucket(bucket: str) -> str:
    mapping = {
        "Thorax": "thorax",
        "Head": "head",
        "AntL": "antenna_left",
        "AntR": "antenna_right",
        "Abdomen": "abdomen",
        "WingL": "wing_left",
        "WingR": "wing_right",
        "HaltL": "haltere_left",
        "HaltR": "haltere_right",
    }
    if bucket in mapping:
        return mapping[bucket]
    # Coxa_T1_left -> coxa_T1_left
    kind, rest = bucket.split("_", 1)
    return f"{kind.lower()}_{rest}"


# Parent joints in the simplified graph (anim graph, not full XML).
PARENT_BUCKET = {
    "Thorax": None,
    "Head": "Thorax",
    "AntL": "Head",
    "AntR": "Head",
    "Abdomen": "Thorax",
    "WingL": "Thorax",
    "WingR": "Thorax",
    "HaltL": "Thorax",
    "HaltR": "Thorax",
}
for side in ("left", "right"):
    for t in ("T1", "T2", "T3"):
        PARENT_BUCKET[f"Coxa_{t}_{side}"] = "Thorax"
        PARENT_BUCKET[f"Femur_{t}_{side}"] = f"Coxa_{t}_{side}"
        PARENT_BUCKET[f"Tibia_{t}_{side}"] = f"Femur_{t}_{side}"


def main():
    print("parsing XML…")
    bodies = parse_xml()
    by_name = {b["name"]: b for b in bodies}

    # World xforms in MuJoCo, then convert to three.js.
    world: dict[str, Xform] = {}
    for b in bodies:
        local = Xform(convert_pos(b["pos"]), convert_quat(b["quat"]))
        if b["parent"] is None:
            world[b["name"]] = local
        else:
            world[b["name"]] = world[b["parent"]].compose(local)

    cache: dict[str, tuple] = {}

    def load_mesh(file_name: str, mesh_name: str):
        key = (file_name, mesh_name)
        if key in cache:
            return cache[key]
        path = ASSETS / file_name
        print(f"  load {file_name}")
        verts, norms, faces, fnorms = parse_obj(path)
        target = target_faces_for(mesh_name, len(faces))
        wv, wn, wf = weld_and_cluster(verts, norms, faces, fnorms, target)
        # convert coords
        wv = [convert_pos(v) for v in wv]
        wn = [vnorm(convert_pos(n)) for n in wn]
        cache[key] = (wv, wn, wf)
        print(f"    {len(faces)} -> {len(wf)} tris, {len(wv)} verts")
        return cache[key]

    # Collect geometry into bucket/material bins, in the bucket joint's local space.
    bins: dict[tuple[str, str], dict] = {}
    for b in bodies:
        bucket = bucket_of(b["name"])
        joint_name = joint_body_for_bucket(bucket)
        joint_world = world[joint_name]
        inv = joint_world.inverse()
        body_world = world[b["name"]]
        for g in b["geoms"]:
            if g["mesh"] in SKIP_MESH:
                continue
            geom_local = Xform(convert_pos(g["pos"]), convert_quat(g["quat"]))
            geom_world = body_world.compose(geom_local)
            local = inv.compose(geom_world)
            verts, norms, faces = load_mesh(g["file"], g["mesh"])
            tv = [local.apply(v) for v in verts]
            tn = [local.apply_n(n) for n in norms]
            key = (bucket, g["material"])
            slot = bins.get(key)
            if slot is None:
                slot = {"v": [], "n": [], "f": []}
                bins[key] = slot
            base = len(slot["v"])
            slot["v"].extend(tv)
            slot["n"].extend(tn)
            slot["f"].extend((a + base, b_ + base, c + base) for a, b_, c in faces)

    # Scale + plant applied on the Fly root so joint locals stay consistent.
    world_pts = []
    for (bucket, _mat), slot in bins.items():
        jn = joint_body_for_bucket(bucket)
        xf = world[jn]
        for v in slot["v"]:
            world_pts.append(xf.apply(v))
    min_y = min(p[1] for p in world_pts)
    max_y = max(p[1] for p in world_pts)
    min_z = min(p[2] for p in world_pts)
    max_z = max(p[2] for p in world_pts)
    min_x = min(p[0] for p in world_pts)
    max_x = max(p[0] for p in world_pts)
    print(
        f"mujoco/three AABB x[{min_x:.3f},{max_x:.3f}] y[{min_y:.3f},{max_y:.3f}] z[{min_z:.3f},{max_z:.3f}] "
        f"len={max_z-min_z:.3f}"
    )
    plant_y = FOOT_Y - min_y * MODEL_SCALE
    print(f"Fly scale={MODEL_SCALE} plantY={plant_y:.4f}")

    # Build glTF nodes: Fly root -> joint groups -> anim groups -> meshes
    nodes = []
    meshes = []
    accessors = []
    views = []
    blob = bytearray()

    def add_view(data: bytes, target: int | None = None):
        while len(blob) % 4:
            blob.append(0)
        off = len(blob)
        blob.extend(data)
        while len(blob) % 4:
            blob.append(0)
        view = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target:
            view["target"] = target
        views.append(view)
        return len(views) - 1

    def add_accessor(view, ctype, count, typ, mn=None, mx=None):
        acc = {"bufferView": view, "componentType": ctype, "count": count, "type": typ}
        if mn is not None:
            acc["min"] = mn
            acc["max"] = mx
        accessors.append(acc)
        return len(accessors) - 1

    gltf_mats = []
    for name, (r, g, b, a, rough, metal, trans) in MATERIALS.items():
        mat = {
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": [r, g, b, a],
                "metallicFactor": metal,
                "roughnessFactor": rough,
            },
            "doubleSided": True,
        }
        if trans:
            mat["alphaMode"] = "BLEND"
        else:
            mat["alphaMode"] = "OPAQUE"
        gltf_mats.append(mat)

    def add_mesh(slot, mat_name):
        v = slot["v"]
        n = slot["n"]
        f = slot["f"]
        if not f:
            return None
        pos = b"".join(struct.pack("<fff", *p) for p in v)
        nrm = b"".join(struct.pack("<fff", *p) for p in n)
        idx = b"".join(struct.pack("<I", i) for tri in f for i in tri)
        xs = [p[0] for p in v]
        ys = [p[1] for p in v]
        zs = [p[2] for p in v]
        pv = add_view(pos, 34962)
        nv = add_view(nrm, 34962)
        iv = add_view(idx, 34963)
        pa = add_accessor(pv, 5126, len(v), "VEC3", [min(xs), min(ys), min(zs)], [max(xs), max(ys), max(zs)])
        na = add_accessor(nv, 5126, len(n), "VEC3")
        ia = add_accessor(iv, 5125, len(f) * 3, "SCALAR")
        meshes.append(
            {
                "primitives": [
                    {
                        "attributes": {"POSITION": pa, "NORMAL": na},
                        "indices": ia,
                        "material": MAT_INDEX[mat_name],
                    }
                ]
            }
        )
        return len(meshes) - 1

    def add_node(name, children=None, mesh=None, translation=None, rotation=None):
        node = {"name": name}
        if children:
            node["children"] = children
        if mesh is not None:
            node["mesh"] = mesh
        if translation:
            node["translation"] = [round(translation[0], 6), round(translation[1], 6), round(translation[2], 6)]
        if rotation:
            # glTF is xyzw
            w, x, y, z = rotation
            node["rotation"] = [round(x, 7), round(y, 7), round(z, 7), round(w, 7)]
        nodes.append(node)
        return len(nodes) - 1

    # Mesh nodes per bucket (children of Anim), plus joint/anim pairs.
    bucket_mesh_ids: dict[str, list[int]] = defaultdict(list)
    total_tris = 0
    for (bucket, mat), slot in bins.items():
        total_tris += len(slot["f"])
        mid = add_mesh(slot, mat)
        if mid is None:
            continue
        nid = add_node(f"{bucket}_{mat}", mesh=mid)
        bucket_mesh_ids[bucket].append(nid)
    print(f"total tris {total_tris}")

    # Build joint graph from the leaves up so children exist.
    # We'll create Anim node (meshes as children) and Joint node (anim as child).
    anim_of = {}
    joint_of = {}

    def local_from_parent(bucket: str) -> Xform:
        jname = joint_body_for_bucket(bucket)
        xf = world[jname]
        parent = PARENT_BUCKET[bucket]
        if parent is None:
            return xf
        p_xf = world[joint_body_for_bucket(parent)]
        return p_xf.inverse().compose(xf)

    # Ensure creation order: parents first by a manual sequence
    order = ["Thorax", "Head", "AntL", "AntR", "Abdomen", "WingL", "WingR", "HaltL", "HaltR"]
    for side in ("left", "right"):
        for t in ("T1", "T2", "T3"):
            order += [f"Coxa_{t}_{side}", f"Femur_{t}_{side}", f"Tibia_{t}_{side}"]

    for bucket in reversed(order):
        mesh_children = bucket_mesh_ids.get(bucket, [])
        # children joint ids that parent to this bucket
        child_joints = [joint_of[b] for b in order if PARENT_BUCKET[b] == bucket and b in joint_of]
        anim_children = mesh_children + child_joints
        anim_id = add_node(f"{bucket}Anim", children=anim_children or None)
        anim_of[bucket] = anim_id
        loc = local_from_parent(bucket)
        # Thorax is the visual root; its world pose becomes the Fly child's local.
        joint_id = add_node(bucket, children=[anim_id], translation=loc.p, rotation=loc.q)
        joint_of[bucket] = joint_id

    fly_id = add_node(
        "Fly",
        children=[joint_of["Thorax"]],
        translation=(0.0, plant_y, 0.0),
    )
    nodes[fly_id]["scale"] = [MODEL_SCALE, MODEL_SCALE, MODEL_SCALE]

    gltf = {
        "asset": {
            "version": "2.0",
            "generator": "drosocore flybody packer",
            "copyright": "flybody (DeepMind & HHMI Janelia), Apache-2.0",
        },
        "scene": 0,
        "scenes": [{"nodes": [fly_id], "name": "Drosophila"}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": gltf_mats,
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(blob)}],
        "extras": {
            "source": "https://github.com/google-deepmind/mujoco_menagerie/tree/main/flybody",
            "citation": "Vaxenburg et al. bioRxiv 2024. doi:10.1101/2024.03.11.584515",
            "scale": MODEL_SCALE,
            "tris": total_tris,
        },
    }
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(js) % 4:
        js += b" "
    while len(blob) % 4:
        blob.append(0)
    total = 12 + 8 + len(js) + 8 + len(blob)
    header = struct.pack("<4sII", b"glTF", 2, total)
    json_chunk = struct.pack("<I4s", len(js), b"JSON") + js
    bin_chunk = struct.pack("<I4s", len(blob), b"BIN\x00") + bytes(blob)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(header + json_chunk + bin_chunk)
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.2f} MB) tris={total_tris} nodes={len(nodes)}")


if __name__ == "__main__":
    sys.exit(main() or 0)
