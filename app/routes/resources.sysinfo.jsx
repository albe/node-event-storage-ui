import { getSysinfoWithHistory } from '../sysinfo-history.server.js';

export async function loader() {
  const data = await getSysinfoWithHistory();

  return Response.json(data, {
    headers: { 'Cache-Control': 'public, max-age=4, stale-while-revalidate=1' }
  });
}
