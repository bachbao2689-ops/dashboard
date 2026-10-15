/** Stable ordered query required; paginate instead of silently stopping at 1,000. */
export async function readAllRows(query: any): Promise<any[]> {
  const rows:any[]=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await query.range(offset,offset+499);
    if(error)throw error;
    rows.push(...(data||[]));
    if(!data||data.length<500)return rows;
  }
}
