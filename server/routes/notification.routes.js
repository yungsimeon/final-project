const router = require("express").Router();
const Notification = require("../models/Notification.model");

router.get("/", async (req, res) => {
  const userId = req.payload._id;
  try {
    const notifications = await Notification.find({ to: userId }).populate({
      path: "from",
      select: "userName userIcon ",
    });

    await Notification.updateMany({ to: userId }, { read: true });
    res.status(200).json(notifications);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching notifications" });
  }
});

router.delete("/", async (req, res) => {
  const userId = req.payload._id;
  try {
    await Notification.deleteMany({ to: userId });
    res.status(200).json({ message: "Notifications deleted" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error deleting notifications" });
  }
});

module.exports = router;
