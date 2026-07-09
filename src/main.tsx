import React from "react";
import ReactDOM from "react-dom/client";
import Palette from "./Palette";
import Widget from "./Widget";
import "./index.css";

const isWidget = window.location.search.includes("window=widget");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isWidget ? <Widget /> : <Palette />}
  </React.StrictMode>
);
