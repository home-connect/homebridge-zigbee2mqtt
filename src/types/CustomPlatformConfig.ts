export type CustomPlatformConfig = {
  mqtt: string;
  portmqtt: number;
  tlsmqtt: boolean;
  usermqtt: string;
  passmqtt: string;
  zigbee2mqtt: {
    baseTopic: string;
  };
};
