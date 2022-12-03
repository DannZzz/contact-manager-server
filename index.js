import { uuid } from "anytool";
import express from "express";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import path from "path";

import base from "./base.json" assert { type: "json" };
import { PORT } from "./config.js";

const uploads = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      callback(null, "./uploads");
    },
    filename: (req, file, callback) => {
      callback(null, Date.now() + "-" + file.originalname);
    },
  }),
});

let baseArr = base;

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000"],
  })
);

app.use(express.json());

app.get("/list/get", (req, res) => {
  res.json({
    status: "OK",
    data: baseArr.map((cnt) => {
      return { ...cnt, avatar: avatarUrl(cnt.avatar) };
    }),
  });
});

app.post("/list/create", uploads.single("avatar"), (req, res) => {
  const newD = { ...req.body, id: uuid(16, { numbers: "only" }) };
  if (req.file) newD.avatar = req.file.filename;
  baseArr.push(newD);

  fs.writeFile("./base.json", JSON.stringify(baseArr, null, 2), () => {
    res.json({
      status: "OK",
      data: { ...newD, avatar: avatarUrl(newD.avatar) },
    });
  });
});

app.delete("/list/delete", (req, res) => {
  const ids = req.query?.ids?.split(",");
  ids.forEach((id) => {
    const thisCnt = baseArr.find((cnt) => cnt.id === id);
    if (thisCnt.avatar)
      fs.unlink(path.resolve("./uploads", thisCnt.avatar), () => {});
  });
  baseArr = baseArr.filter((cnt) => !ids.includes(cnt.id));
  fs.writeFile("./base.json", JSON.stringify(baseArr, null, 2), () => {
    res.json({
      status: "OK",
    });
  });
});

app.get("/contact/:id", (req, res) => {
  const contact = baseArr.find((cnt) => cnt.id === req.params.id);
  if (!contact) return res.json({ status: "Invalid", msg: "Not found" });
  res.json({
    status: "OK",
    data: { ...contact, avatar: avatarUrl(contact.avatar) },
  });
});

app.put("/list/edit/:id", uploads.single("avatar"), (req, res) => {
  const contact = baseArr.find((cnt) => cnt.id === req.params.id);
  const index = baseArr.findIndex((cnt) => cnt.id === req.params.id);
  if (!contact) return res.json({ status: "Invalid", message: "Not found" });
  const newD = { ...req.body };
  if (req.file && contact.avatar) {
    fs.unlink(path.resolve("./uploads", contact.avatar), () => {});
    newD.avatar = req.file.filename;
  }

  baseArr[index] = { ...contact, ...newD };
  fs.writeFile("./base.json", JSON.stringify(baseArr, null, 2), () => {
    res.json({
      status: "OK",
      data: { ...baseArr[index], avatar: avatarUrl(baseArr[index].avatar) },
    });
  });
});

app.use("/static/avatar", express.static("./uploads"));

app.listen(5000, () => {
  console.log("PORT: " + PORT);
});

function avatarUrl(name) {
  return `http://localhost:5000/static/avatar/${name || "default.jpg"}`;
}
