export function getMapPosition(state) {
const position =
((state.year - 1) * 12)
+ (state.month - 4);
return Math.max(0, position);
}
export function getGrowthMap(state) {
const currentPosition =
getMapPosition(state);
return Array.from(
{ length: 60 },
(_, index) => ({
visited:
index < currentPosition,
current:
index === currentPosition
})
);
}