import { financeRoutes } from './apps/finance';
import { createLocalBackend } from './index';

export { LOCAL_URL } from './index';
export const localBackend = createLocalBackend('finance', financeRoutes);
