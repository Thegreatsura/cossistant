import { env } from "@api/env";
import { Polar } from "@polar-sh/sdk";

const polarClient = new Polar({
  accessToken: env.POLAR_ACCESS_TOKEN,
  server: env.NODE_ENV === "production" ? "production" : "sandbox",
});

export default polarClient;
