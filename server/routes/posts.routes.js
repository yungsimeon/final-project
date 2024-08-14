const router = require("express").Router();
const User = require("../models/User.model");
const Notification = require("../models/Notification.model");
const cloudinary = require("cloudinary").v2;
const Post = require("../models/Post.model");
const mongoose = require("mongoose");

router.post("/", async (req, res) => {
  try {
    const { text } = req.body;
    let { img } = req.body;
    const userId = req.payload._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!text && !img)
      return res.status(400).json({ message: "Post must have text or image" });

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img);
      img = uploadedResponse.secure_url;
    }

    const newPost = new Post({
      user: userId,
      text,
      img,
    });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error creating post" });
  }
});

router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        selcet: "-password",
      });
    if (posts.length === 0) return res.status(200).json([]);
    res.status(200).json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching posts" });
  }
});

router.post("/like/:id", async (req, res) => {
  try {
    const userId = req.payload._id;
    const { id: postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const userLikedPost = post.likes.includes(userId);
    if (userLikedPost) {
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      const updatedLikes = post.likes.filter((id) => {
        id.toString() !== userId.toString();
      });

      res.status(200).json(updatedLikes);
    } else {
      post.likes.push(userId);
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
      await post.save();
      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      });
      await notification.save();
      const updatedLikes = post.likes;
      res.status(200).json(updatedLikes);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error liking post" });
  }
});

router.get("/likes/:id", async (req, res) => {
  const userId = req.payload._id;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const likedPosts = await Post.find({
      _id: { $in: user.likedPosts },
    })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });
    res.status(200).json(likedPosts);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching liked Posts" });
  }
});

router.post("/comment/:id", async (req, res) => {
  try {
    const { id: postId } = req.params;
    const { text } = req.body;
    const userId = req.payload._id;
    if (!text) return res.status(400).json({ message: "Text is required" });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const comment = { user: userId, text };
    post.comments.push(comment);
    await post.save();
    res.status(200).json(post);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error commenting on post" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.payload._id;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (userId.toString() !== post.user.toString()) {
      return res.status(401).json({ message: "You can't delete this post" });
    }

    if (post.img) {
      const imgId = post.img.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imgId);
    }
    await Post.findByIdAndDelete(postId);
    res.status(200).json({ message: "Post successfully deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error deleting post" });
  }
});

router.get("/following", async (req, res) => {
  const userId = req.payload._id;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const following = user.following;
    const followingPosts = await Post.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });
    res.status(200).json(followingPosts);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching followed posts" });
  }
});

router.get("/user/:username", async (req, res) => {
  const { username: userName } = req.params;
  console.log(req.params);
  try {
    const user = await User.findOne({ userName });
    if (!user) return res.status(404).json({ message: "User not found" });
    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });
    res.status(200).json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching user" });
  }
});

module.exports = router;
