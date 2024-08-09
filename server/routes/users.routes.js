const router = require("express").Router();
const bcrypt = require("bcryptjs");
const cloudinary = require("cloudinary").v2;
const User = require("../models/User.model");
const Notification = require("../models/Notification.model");

router.get("/profile/:username", async (req, res) => {
  try {
    const { username: userName } = req.params;
    const user = await User.findOne({ userName }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching user profile" });
  }
});

router.post("/follow/:userId", (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.payload._id;

  Promise.all([User.findById(userId), User.findById(currentUserId)])

    .then(([userToFollow, currentUser]) => {
      if (userId === currentUserId)
        return res.status(400).json({ error: "Cant follow User" });
      if (!userToFollow || !currentUser)
        return res.status(400).json({ error: "User not found" });
      const isFollowing = currentUser.following.includes(userId);
      if (isFollowing) {
        //unfollow User
        return Promise.all([
          User.findByIdAndUpdate(userId, {
            $pull: { followers: currentUserId },
          }),
          User.findByIdAndUpdate(currentUserId, {
            $pull: { following: userId },
          }),
        ]).then(() => {
          //tobe return id of user
          res.status(200).json({ message: "Unfollowed User" });
        });
      } else {
        //follow User
        Promise.all([
          User.findByIdAndUpdate(userId, {
            $push: { followers: currentUserId },
          }),
          User.findByIdAndUpdate(currentUserId, {
            $push: { following: userId },
          }),
        ]).then(() => {
          const newNotification = new Notification({
            type: "follow",
            from: currentUserId,
            to: userId,
          });
          newNotification.save();

          //tobe return id of user
          res.status(200).json({ message: "Followed User" });
        });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Error following user" });
    });
});

router.get("/suggested", async (req, res) => {
  try {
    const currentUserId = req.payload._id;
    const usersFollowedByMe = await User.findById(currentUserId).select(
      "following"
    );
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: currentUserId },
        },
      },
      { $sample: { size: 10 } },
    ]);

    const filteredUsers = users.filter((user) => {
      return !usersFollowedByMe.following.includes(user._id);
    });
    const suggestedUsers = filteredUsers.slice(0, 4);
    suggestedUsers.forEach((user) => (user.password = null));
    res.status(200).json(suggestedUsers);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching suggested users" });
  }
});

router.post("/update", async (req, res) => {
  const { name, email, userName, currentPassword, newPassword, bio, link } =
    req.body;
  let { userIcon, userCover } = req.body;
  const userId = req.payload._id;

  try {
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      (!currentPassword && newPassword) ||
      (!newPassword && currentPassword)
    ) {
      return res
        .status(400)
        .json({ message: "Please provide both the current and new Password" });
    }

    if (currentPassword && newPassword) {
      const isMatching = await bcrypt.compare(currentPassword, user.password);
      if (!isMatching) {
        return res.status(400).json({ message: "Password is incorrect" });
      }

      const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          message:
            "Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.",
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    if (userIcon) {
      if (user.userIcon) {
        await cloudinary.uploader.destroy(
          user.userIcon.split("/").pop().split(".")[0]
        );
      }
      const uploadedResponse = await cloudinary.uploader.upload(userIcon);
      userIcon = uploadedResponse.secure_url;
    }

    if (userCover) {
      if (user.userCover) {
        await cloudinary.uploader.destroy(
          user.userCover.split("/").pop().split(".")[0]
        );
      }
      const uploadedResponse = await cloudinary.uploader.upload(userCover);
      userCover = uploadedResponse.secure_url;
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.userName = userName || user.userName;
    user.bio = bio || user.bio;
    user.link = link || user.link;
    user.userIcon = userIcon || user.userIcon;
    user.userCover = userCover || user.userCover;

    await user.save();

    user.password = null;
    return res.status(200).json(user);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Error" });
  }
});

module.exports = router;
