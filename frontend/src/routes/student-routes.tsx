import { RouteObject } from "react-router-dom";
import StudentLayout from "@/layouts/student-layout";
import StudentDashboard from "@/pages/student/dashboard";
import StudentCourses from "@/pages/student/courses";
import StudentProfile from "@/pages/student/profile";
import ItemContainer from "@/components/Item-container";
import CoursePage from "@/pages/student/course-page";
// import ParentComponent from "@/ai-components/ParentComponent";
import { Item } from "@/components/Item-container"; // Assuming Item is defined in Item-container
import StudentPoll from "@/pages/student/StudentPoll";
import JoinRoom from "@/pages/student/join-room"; // <-- Import the JoinRoom page

const studentRoutes: RouteObject = {
  path: "/student",
  element: <StudentLayout />,
  children: [
    {
      path: "dashboard",
      element: <StudentDashboard />,
    },
    {
      path: "courses",
      element: <StudentCourses />,
    },
    {
      path: "profile",
      element: <StudentProfile />,
    },
    {
      path: "video",
      element: <ItemContainer item={{name:"abc", itemtype:"video", content:"https://www.youtube.com/watch?v=vBH6GRJ1REM"} as Item} courseId="" courseVersionId="" userId="" />
    },
    {
      path:"article",
      element: <ItemContainer item={{name:"abc", itemtype:"article", content:"This is a sample article content."} as Item} courseId="" courseVersionId="" userId="" />
    },
    {
      path: "quiz",
      element: <ItemContainer item={{name:"abc", itemtype:"quiz", content:"This is a sample quiz content."} as Item} courseId="" courseVersionId="" userId="" />
    },
    // {
    //   path: "test-ai",
    //   element: <ParentComponent />, // AI component for testing
    // },
    {
      path: "livepoll",
      element: <StudentPoll />,
    },
    {
      path: "join-room", // <-- Add this route for students to join a room and attempt polls
      element: <JoinRoom />,
    },
    {
      index: true,
      element: <StudentDashboard />, // Default to Dashboard
    }
  ],
};

const learnRoutes: RouteObject = {
  path: "student/learn",
  element: <CoursePage />
};


export default {studentRoutes, learnRoutes};
