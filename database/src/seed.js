import { connectDB } from "./connect.js";
import ClassModel from "./models/Class.js";
import EventModel from "./models/Event.js";

await connectDB();

await EventModel.deleteMany({});
await ClassModel.deleteMany({});

const classes = await ClassModel.create([
  { name: "CS 477", professor: "Russell", semester: "Spring 2026" },
  { name: "CS 471", professor: "TBD", semester: "Spring 2026" }
]);

await EventModel.create([
  {
    classId: classes[0]._id,
    title: "Lab 3 Due",
    type: "assignment",
    startAt: new Date("2026-02-16T23:59:00-05:00")
  },
  {
    classId: classes[0]._id,
    title: "Study Session",
    type: "study",
    startAt: new Date("2026-02-14T18:00:00-05:00"),
    endAt: new Date("2026-02-14T19:00:00-05:00")
  }
]);

console.log("✅ Seed complete");
process.exit(0);
