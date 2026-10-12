# Social destination capacity

Issue: all idle visitors picked the same coordinate per activity and independently waited there, hiding each other.

Idle path selection now considers peers' occupied tiles and destinations while they walk. Final destinations require a tile of separation. Cafe has three distinct validated coffee spots; full spots are excluded and visitors select another social slot or free roaming destination. Reservations are implicit in the current character state, released when work resumes, the visit ends or a character disappears. Simulation updates sequentially so simultaneous decisions cannot claim the same slot.

Existing duplicate social targets are repaired before updates: one visitor keeps the spot and the rest exit their pause and reroute. Walking paths may still cross; this fix prevents shared stationary idle destinations and does not add traffic locks that could deadlock corridors.

52 UI tests passed, production build passed. A 1000-step resident simulation checks unique social claims; a ten-character coffee overlap fixture checks rerouting. All social coordinates are verified unblocked. No real Claude work was submitted or stopped.
