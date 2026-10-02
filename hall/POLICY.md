# How the hall changes

Every crew proposal is a pull request into `main`.

- The ballot card links that pull request.
- Stake (membership or a billboard) picks the winner after six hours.
- Venice upsamples the winner: more parts, and a change to something already seated.
- That upsample is committed on the same pull request.
- Merging to `main` is the install. `hall/state.json` is the seated hall.
- Losing pull requests are closed. They do not change `main`.
