# MLM MemberStack Planner - Project TODO

- [x] Database schema for organizations, members, and 3x5 downline matrix placements
- [x] Backend database queries and tRPC routers for organizations, members, and placements
- [x] Strict 3x5 matrix placement validation (3 legs max per node, 5 levels max depth, no duplicate assignments, no circular references)
- [x] Randomized and automatic slot placement from master member list
- [x] Unstack/remove member action to return them safely to available pool
- [x] Seed data script with realistic MLM organizations, member profiles, and high-quality photo avatars
- [x] Master Member Directory UI with search, rank badges, photo avatars, and filter by available (unplaced) vs placed
- [x] Member profile modal for creating, viewing, and editing members with photo selection
- [x] Interactive 3 × 5 Downline Tree visualization with CAD-style connecting branches, level meters, and drill-down support
- [x] Open slot cards with "+ ASSIGN" action and modal to pick unplaced members
- [x] One-click "Random Place" and "Auto-Fill Next Open Slots" toolbar actions
- [x] Organization switcher to toggle between different MLM companies/networks
- [x] Architectural blueprint aesthetic: deep royal-blue background, subtle grid, technical lines, dimension markers, and coordinate stamps
- [x] Visual richness with member photos on every view and blueprint schematic accents
- [x] Vitest test suite covering 3x5 tree constraints, placement logic, duplicate prevention, and random stacking
