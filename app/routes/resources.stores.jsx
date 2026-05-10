import { listStores } from '../../eventstore';

export async function loader() {
  return { stores: listStores() };
}
