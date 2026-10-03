import type { Role } from "@/lib/roles";
import type { StageId } from "@/lib/tiers";
import type { CiGear } from "@/lib/ci";
import { MemberStudio } from "@/components/scene/MemberStudio";

export function MembershipPreview({
  role,
  stage,
  seed,
  className,
  capture,
  upgrade = "none",
}: {
  role: Role;
  stage: StageId;
  seed: number;
  className?: string;
  spin?: number;
  capture?: (dataUrl: string) => void;
  upgrade?: CiGear;
}) {
  return (
    <MemberStudio
      role={role}
      stage={stage}
      seed={seed}
      upgrade={upgrade}
      capture={capture}
      className={className ?? "h-40 w-full rounded-lg border border-border sm:h-48"}
    />
  );
}
