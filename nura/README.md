# NURA: motion specification / active implementation

Purpose: reproduce the grab-point creature's motion rather than moving a spherical character along a preset path. Playback preview: `/nura/` on GitHub Pages. Engine: Three.js/WebGL; Godot implementation remains out of scope of this runnable browser preview.

## Motion contract

- Sample surface-facing world-space grip points (0.27m exclusion), including rock collider snaps; remove buried candidates; query with spatial hash.
- Drive one body mass from the *previous frame's* grip count (gravitational support), nearby contact plane and surface-tangent input. No `autoPath`/preset body coordinates. A direction vector, not a positional track, steers AUTO.
- Parallel-transport the forward vector between face normals (floor → riser → wall → top/underside). Clamp body collisions against assembled world-space colliders, not hardcoded x/y stage gates.
- Assign each anchor to at most one REACH/GRIP at a time. Score reachable holds on distance, normal, forward direction and grip separation. Advance IDLE → REACH → GRIP → RELEASE. Mandatory release at >=92% rope length; free rear grips opportunistically.
- Treat held ropes as maximum-length unilateral constraints: inward slack is free. Solve rope appearance only after body and grip decisions; never feed Verlet shape backward into body control.
- Display body and capsules with black SDF raymarching; absorb pools only with three feeding grips; grow 8 → 12 → 18 → 26 → 40. Long launch winches by shortening one rope.

## Acceptance checks

1. From reset, hold W without AUTO; the body uses one motor to cross stairs, climb the wall and reach the roof. The contact normal and the transported forward direction change; wall movement must not be keyed to world x/y.
2. Auto traverses the level with the same local motion rules, feeding at all four pools without hardcoded body waypoints and ending at 40 appendages.
3. Held anchor IDs are unique; rope constraints never pull a *slack* segment; the same system works for wall and ceiling candidates.
4. PC and simulated mobile Chrome display the body without script/shader errors. Touch steering, camera drag, pointer cancellation, and text selection prevention work. Simulated mobile is not proof of physical iPhone Safari behavior.

## Remaining quality gaps

The prototype does not yet match the original liquid render in all cases: touch-point splashes, detached filaments and physically coherent self-occlusion across all arms remain incomplete. A Godot 4/GDScript port has not been created. It should not be called full parity with the reference video.
