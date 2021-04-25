export default interface deviceInfo {
  ieee_address: string;
  friendly_name: string;
  supported: boolean;
  definition?: {
    description: string;
    exposes: {
      type: string;
      features: {
        type: string;
        name: string;
      }[];
      model: string;
      supports_ota: boolean;
      vendor: string;
    }[];
  };
}
