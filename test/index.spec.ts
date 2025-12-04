import worker from "@/index";
import { env, fetchMock } from "cloudflare:test";
import { describe, expect, it, beforeAll, afterEach } from "vitest";

import carreras from "./mocks/carreras.json";
import asignaturas from "./mocks/asignaturas.json";
import modulos from "./mocks/modulos.json";
import aCalificaciones from "./mocks/calificaciones/6205031.json";
import mICalificaciones from "./mocks/calificaciones/2201561-I.json";
import mIICalificaciones from "./mocks/calificaciones/2201561-II.json";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

describe("Refresh courses", () => {
  // This test only works the first time it is run, then env.DATA.put fails
  it("responds with a success message", async () => {
    fetchMock
      .get(env.BASE_URL)
      .intercept({ path: `/v2/config/get_carreras/${env.RUN}` })
      .reply(200, carreras);
    fetchMock
      .get(env.BASE_URL)
      .intercept({ path: `/calificaciones/get_asignaturas/${env.RUN}/29370/2/2025/1/2025/2` })
      .reply(200, asignaturas);
    fetchMock.get(env.BASE_URL).intercept({ path: "/calificaciones/get_modulos/2201561/1/2025/2" }).reply(200, modulos);
    fetchMock
      .get(env.BASE_URL)
      .intercept({ path: `/calificaciones/get_calificaciones/${env.RUN}/6205031/2/2025/2` })
      .reply(200, aCalificaciones);
    fetchMock
      .get(env.BASE_URL)
      .intercept({ path: `/calificaciones/get_calificaciones_modular/${env.RUN}/2201561/1/2025/2/29370/2/1/1` })
      .reply(200, mICalificaciones);
    fetchMock
      .get(env.BASE_URL)
      .intercept({ path: `/calificaciones/get_calificaciones_modular/${env.RUN}/2201561/1/2025/2/29370/2/2/1` })
      .reply(200, mIICalificaciones);

    const request = new IncomingRequest("http://example.com/refresh-courses");
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: "Cursos actualizados" });
  });
});
