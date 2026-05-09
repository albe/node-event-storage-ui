import { json } from '@remix-run/node';
import { listStores } from '../../eventstore';

export async function loader() {
  return json({ stores: listStores() });
}
