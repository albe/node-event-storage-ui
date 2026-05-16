import { listStores } from '../../eventstore';

export async function loader() {
  return Response.json({ stores: listStores() });
}
