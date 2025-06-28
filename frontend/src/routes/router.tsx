import {
  Router,
  Route,
  RootRoute,
  redirect,
  createMemoryHistory,
  Outlet,
  NotFoundRoute,
  useNavigate,
} from '@tanstack/react-router';
import { useAuthStore } from '@/lib/store/auth-store';
import { useEffect } from 'react';

// Layouts
import TeacherLayout from '@/layouts/teacher-layout';
import StudentLayout from '@/layouts/student-layout';

// Teacher Pages
import AuthPage from '@/pages/auth-page';
import Dashboard from '@/pages/teacher/dashboard';
import CreateCourse from '@/pages/teacher/create-course';
import GetCourse from '@/pages/teacher/get-course';
import Editor from '@/pages/teacher/create-article';
import FaceDetectors from '@/pages/testing-proctoring/face-detectors';
import GenAIHomePage from '@/pages/teacher/genai-home';
import TeacherPoll from '@/pages/teacher/LivePoll';
import CreateRoom from '@/pages/teacher/create-room';

// Student Pages
import StudentDashboard from '@/pages/student/dashboard';
import StudentCourses from '@/pages/student/courses';
import StudentProfile from '@/pages/student/profile';
import StudentPoll from '@/pages/student/StudentPoll';
import JoinRoom from '@/pages/student/join-room';
import CoursePage from '@/pages/student/course-page';

// Components
import { NotFoundComponent } from '@/components/not-found';
import ItemContainer, { Item } from '@/components/Item-container';
import { useCourseStore } from '@/lib/store/course-store';

const sampleText = `# Sample Markdown with Math...` // (Shortened for brevity)

// Root Route
const rootRoute = new RootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundComponent,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center p-8 bg-red-50 rounded-lg shadow-lg max-w-md">
        <h1 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h1>
        <p className="text-red-600 mb-6">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => window.location.href = '/auth'}
        >Go to Login</button>
      </div>
    </div>
  ),
});

const authRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: AuthPage,
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (isAuthenticated && user?.role) {
      throw redirect({ to: `/${user.role}` });
    }
  },
});

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (isAuthenticated && user?.role) {
      throw redirect({ to: `/${user.role}` });
    }
    throw redirect({ to: '/auth' });
  },
  component: () => null,
});

const teacherLayoutRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/teacher',
  component: TeacherLayout,
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated || user?.role !== 'teacher') {
      throw redirect({ to: user?.role === 'student' ? '/student' : '/auth' });
    }
  },
});

const studentLayoutRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/student',
  component: StudentLayout,
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated || user?.role !== 'student') {
      throw redirect({ to: user?.role === 'teacher' ? '/teacher' : '/auth' });
    }
  },
});

const teacherDashboardRoute = new Route({ getParentRoute: () => teacherLayoutRoute, path: '/', component: Dashboard });
const teacherCreateCourseRoute = new Route({ getParentRoute: () => teacherLayoutRoute, path: '/courses/create', component: CreateCourse });
const teacherGetCourseRoute = new Route({ getParentRoute: () => teacherLayoutRoute, path: '/courses/get', component: GetCourse });
const teacherCreateArticleRoute = new Route({ getParentRoute: () => teacherLayoutRoute, path: '/courses/articles/create', component: Editor });
const teacherGenAIHomeRoute = new Route({ getParentRoute: () => teacherLayoutRoute, path: '/genai', component: GenAIHomePage });
const teacherLivePollRoute = new Route({ getParentRoute: () => teacherLayoutRoute, path: '/livepoll', component: TeacherPoll });
const teacherTestingRoute = new Route({ getParentRoute: () => teacherLayoutRoute, path: '/testing', component: FaceDetectors });
const teacherCreateRoomRoute = new Route({ getParentRoute: () => teacherLayoutRoute, path: '/create-room', component: CreateRoom });

const studentDashboardRoute = new Route({ getParentRoute: () => studentLayoutRoute, path: '/', component: StudentDashboard });
const studentCoursesRoute = new Route({ getParentRoute: () => studentLayoutRoute, path: '/courses', component: StudentCourses });
const studentProfileRoute = new Route({ getParentRoute: () => studentLayoutRoute, path: '/profile', component: StudentProfile });
const studentLivePollRoute = new Route({ getParentRoute: () => studentLayoutRoute, path: '/livepoll', component: StudentPoll });
const studentJoinRoomRoute = new Route({ getParentRoute: () => studentLayoutRoute, path: '/join-room', component: JoinRoom });

const articleRoute = new Route({
  getParentRoute: () => studentLayoutRoute,
  path: '/article',
  component: () => <ItemContainer item={{ name: "abc", itemtype: "article", content: sampleText } as Item} courseId="A" courseVersionId="B" userId="C" />
});

const videoRoute = new Route({
  getParentRoute: () => studentLayoutRoute,
  path: '/video',
  component: () => <ItemContainer item={{ name: "abc", itemtype: "video", content: "https://www.youtube.com/watch?v=vBH6GRJ1REM" } as Item} courseId="A" courseVersionId="B" userId="C" />
});

const quizRoute = new Route({
  getParentRoute: () => studentLayoutRoute,
  path: '/quiz',
  component: () => <ItemContainer item={{ name: "abc", itemtype: "quiz", content: "Sample quiz content" } as Item} courseId="A" courseVersionId="B" userId="C" />
});

const coursePageRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/student/learn',
  component: CoursePage,
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated || user?.role !== 'student') {
      throw redirect({ to: '/auth' });
    }
    const { currentCourse } = useCourseStore.getState();
    if (!currentCourse || !currentCourse.courseId || !currentCourse.versionId) {
      throw redirect({ to: '/student/courses' });
    }
  },
});

const notFoundRoute = new NotFoundRoute({ getParentRoute: () => rootRoute, component: NotFoundComponent });

const routeTree = rootRoute.addChildren([
  indexRoute,
  authRoute,
  teacherLayoutRoute.addChildren([
    teacherDashboardRoute,
    teacherCreateCourseRoute,
    teacherCreateArticleRoute,
    teacherGetCourseRoute,
    teacherTestingRoute,
    teacherGenAIHomeRoute,
    teacherLivePollRoute,
    teacherCreateRoomRoute,
  ]),
  studentLayoutRoute.addChildren([
    studentDashboardRoute,
    studentCoursesRoute,
    studentProfileRoute,
    articleRoute,
    videoRoute,
    quizRoute,
    studentLivePollRoute,
    studentJoinRoomRoute,
  ]),
  coursePageRoute,
]);

const memoryHistory = typeof window !== 'undefined' ? undefined : createMemoryHistory();

export const router = new Router({
  routeTree,
  defaultPreload: 'intent',
  history: memoryHistory,
  defaultNotFoundComponent: NotFoundComponent,
  notFoundRoute,
});

export const useRedirectBasedOnRole = () => {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const path = window.location.pathname;
      if (path === '/' || path === '/auth') {
        navigate({ to: `/${user.role.toLowerCase()}` });
      } else if (
        (path.startsWith('/teacher') && user.role !== 'teacher') ||
        (path.startsWith('/student') && user.role !== 'student')
      ) {
        navigate({ to: `/${user.role.toLowerCase()}` });
      }
    }
  }, [isAuthenticated, user, navigate]);
};

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
