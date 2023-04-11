export function getSubRecordFromRoot(path: string, data: Record<string, unknown>): Record<string, unknown> | null{
    const pathSegments = path.replace(/\//g, ' ').trim().split(' ')
    console.log('path, data', path, pathSegments, data);
    let segment = data;
    for(const segmentName of pathSegments) {
        if(typeof segment[segmentName] == "object"){
            segment = segment[segmentName] as Record<string,unknown>;
            continue;
        }
        return null;
    }
    return segment;
}