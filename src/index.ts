import { Env } from "./types";
import { router } from "./router";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return router(request, env);
  },
} satisfies ExportedHandler<Env>;
