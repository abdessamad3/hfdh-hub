export const ROSTER_PAGE_SIZE=40;
export function rosterPage(students,{search='',school='',page=0,size=ROSTER_PAGE_SIZE}={}){
 if(!Array.isArray(students)||typeof search!=='string'||typeof school!=='string'||!Number.isInteger(page)||page<0||!Number.isInteger(size)||size<1||size>100)throw new Error('invalid-roster-page');
 const needle=search.toLocaleLowerCase().trim();
 const matches=students.filter(s=>(!school||s.kuttab===school)&&s.name.toLocaleLowerCase().includes(needle));
 const pages=Math.max(1,Math.ceil(matches.length/size)),current=Math.min(page,pages-1);
 return {rows:matches.slice(current*size,(current+1)*size),total:matches.length,page:current,pages,from:matches.length?current*size+1:0,to:Math.min((current+1)*size,matches.length)};
}
