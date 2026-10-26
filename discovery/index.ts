import {parisConnector} from './connectors/paris.js';
import type {Connector} from './connectors/types.js';
export const connectors:Record<string,Connector>={'paris-open-data':parisConnector};
