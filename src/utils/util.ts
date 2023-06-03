export function getSubRecordFromRoot(path: string, data: Record<string, unknown>): unknown {
    const pathSegments = path.replace(/\//g, ' ').trim().split(' ')
    console.log('path, data', path, pathSegments, data);
    let segment = data;
    for(const segmentName of pathSegments) {
        const segmentData = segment[segmentName];
        if(typeof segmentData == "object"){
            segment = segmentData as Record<string,unknown>;
            continue;
        }
        return segmentData;
    }
    return segment;
}
