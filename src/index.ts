import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { Zigbee2MqttPlatform } from './platform';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, 'Zigbee2Mqtt', Zigbee2MqttPlatform);
};
