import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
  APIEvent,
  PlatformAccessoryEvent,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import * as ZigbeeTopic from './zigbee2mqtttopics';

import { ZigbeeAccessory } from './platformAccessory';
import { CustomPlatformConfig } from './types/CustomPlatformConfig';
import * as Mqqt from 'mqtt';
import { MqttClient, Packet } from 'mqtt';
import deviceInfo from './deviceInfo';
import ZigbeeContext from './ZigbeeContext';
/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class Zigbee2MqttPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory<ZigbeeContext>[] = [];
  public readonly config: CustomPlatformConfig & PlatformConfig;

  private mqttClient: Mqqt.MqttClient | undefined;

  constructor(public readonly log: Logger, config: PlatformConfig, public readonly api: API) {
    this.config = config as CustomPlatformConfig & PlatformConfig;
    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on(APIEvent.DID_FINISH_LAUNCHING, () => {
      log.debug('Executed didFinishLaunching callback');
      this.mqttClient = Mqqt.connect(`mqtt://${this.config.mqttaddress}:${this.config.portmqtt}`);
      this.mqttClient.on('connect', () => {
        if (this.mqttClient) {
          this.mqttClient.subscribe(`${this.config.zigbee2mqtt.baseTopic}/#`);
        }
      });
      this.mqttClient.on('message', this.handelMessages.bind(this));
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory<ZigbeeContext>) {
    this.log.debug('Configuring accessory %s', accessory.displayName);

    accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
      this.log.debug('%s identified!', accessory.displayName);
    });

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  addAccessory(device: deviceInfo) {
    const uuid = this.api.hap.uuid.generate(device.ieee_address);
    this.log.debug(uuid);
    return;
  }

  removeAccessory(accessory: PlatformAccessory<ZigbeeContext>) {
    return;
  }

  // mqtt messages

  handelMessages(topic: string, payload: Buffer, packet: Packet): void {
    topic = topic.slice(this.config.zigbee2mqtt.baseTopic.length);
    switch (topic) {
      case ZigbeeTopic.DEVICES: {
        this.handelDevicesMessage(JSON.parse(payload.toString()));
        break;
      }
    }
  }

  handelDevicesMessage(devices: deviceInfo[]) {
    // Filter only supported devices.
    devices = devices.filter((f) => f.supported && f.definition && f.definition.exposes);

    const removedAccessories = this.accessories.filter(
      (a) =>
        devices.filter((d) => d.ieee_address === a.context.deviceInfo.ieee_address).length === 0,
    );

    devices.forEach((device) => {
      this.log.debug(
        'Found device %s (%s) that exposes %s',
        device.friendly_name,
        device.ieee_address,
        device.definition?.exposes.map((s) => s.type).join(','),
      );
      this.addAccessory(device);
    });

    removedAccessories.forEach((accessory) => {
      this.log.debug(
        'Removing accessory %s (%s) that exposes %s',
        accessory.context.deviceInfo.friendly_name,
        accessory.context.deviceInfo.ieee_address,
        accessory.context.deviceInfo.definition?.exposes.map((s) => s.type).join(','),
      );
      this.removeAccessory(accessory);
    });
  }
}
