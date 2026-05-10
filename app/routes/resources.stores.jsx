import { json } from 'react-router';
import { listStores } from '../../eventstore';

export async function loader() {
  return json({ stores: listStores() });
}
