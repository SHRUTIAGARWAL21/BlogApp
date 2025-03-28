const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");
const path = require("path");
const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = "asbjigiuiyj mwelkj32u6983hef";

app.use(express.json());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.connect(
  "mongodb+srv://echowrite:d5qrkYdHPVujkOMw@cluster0.z06gq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (err) {
    console.log(err);
    res.status(400).json(err);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });

  if (!userDoc) {
    return res.status(400).json("user not registered");
  }
  const passOk = bcrypt.compareSync(password, userDoc.password);

  if (passOk) {
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("wrong credentials");
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    // console.log(info);
    res.json(info);
  });
});

app.post("/post", uploadMiddleware.single("files"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;

    const PostDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });

    res.json(PostDoc);
  });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.put("/post", uploadMiddleware.single("files"), async (req, res) => {
  let newPath = null;

  console.log(req.file);
  if (req.file) {
    const { id, originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }
  console.log(newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(info.id) === JSON.stringify(postDoc.author);
    if (!isAuthor) {
      return res.status(400);
      throw "your are not the author";
    }
    if (newPath) {
      console.log(newPath);
    }
    postDoc.set({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });
    await postDoc.save();
    res.json(postDoc);
  });
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const PostDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(PostDoc);
  // console.log(PostDoc);
});

app.listen(4000, () => {
  console.log("listening");
});

// mongodb+srv://echowrite:d5qrkYdHPVujkOMw@cluster0.z06gq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
