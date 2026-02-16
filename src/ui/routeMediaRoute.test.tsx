import assert from "assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RouteMediaBuilder from "./screens/RouteMediaBuilder/RouteMediaBuilder";

const html = renderToStaticMarkup(
  <MemoryRouter initialEntries={["/route-media"]}>
    <Routes>
      <Route path="/route-media" element={<RouteMediaBuilder />} />
    </Routes>
  </MemoryRouter>
);

assert.match(html, /Loading Route Media/i);
console.log("route-media route render test passed");
