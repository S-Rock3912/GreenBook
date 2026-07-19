import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';
import { uuid } from '../lib/uuid';
import type { Course, Hole, Memo, MemoCategory, Shape } from '../types';

function now(): string {
  return new Date().toISOString();
}

function createHoles(count: number): Hole[] {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    shapes: [],
    memos: [],
  }));
}

interface CourseState {
  courses: Course[];
  hydrated: boolean;
  setHydrated: () => void;

  addCourse: (name: string, holeCount: number) => string;
  renameCourse: (courseId: string, name: string) => void;
  deleteCourse: (courseId: string) => void;
  /** 同期のプル結果でコースを丸ごと置換/追加する */
  upsertCourse: (course: Course) => void;

  setHoleImage: (courseId: string, holeNumber: number, imageUrl?: string) => void;
  setHoleShapes: (courseId: string, holeNumber: number, shapes: Shape[]) => void;

  addMemo: (
    courseId: string,
    holeNumber: number,
    category: MemoCategory,
    text: string,
  ) => void;
  updateMemo: (
    courseId: string,
    holeNumber: number,
    memoId: string,
    text: string,
  ) => void;
  deleteMemo: (courseId: string, holeNumber: number, memoId: string) => void;
}

function updateHole(
  courses: Course[],
  courseId: string,
  holeNumber: number,
  fn: (hole: Hole) => Hole,
): Course[] {
  return courses.map((c) =>
    c.id !== courseId
      ? c
      : {
          ...c,
          updatedAt: now(),
          holes: c.holes.map((h) => (h.number === holeNumber ? fn(h) : h)),
        },
  );
}

export const useCourseStore = create<CourseState>()(
  persist(
    (set) => ({
      courses: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

      addCourse: (name, holeCount) => {
        const id = uuid();
        const course: Course = {
          id,
          name: name.trim(),
          holes: createHoles(holeCount),
          createdAt: now(),
          updatedAt: now(),
        };
        set((s) => ({ courses: [course, ...s.courses] }));
        return id;
      },

      renameCourse: (courseId, name) =>
        set((s) => ({
          courses: s.courses.map((c) =>
            c.id === courseId ? { ...c, name: name.trim(), updatedAt: now() } : c,
          ),
        })),

      deleteCourse: (courseId) =>
        set((s) => ({ courses: s.courses.filter((c) => c.id !== courseId) })),

      upsertCourse: (course) =>
        set((s) => {
          const exists = s.courses.some((c) => c.id === course.id);
          return {
            courses: exists
              ? s.courses.map((c) => (c.id === course.id ? course : c))
              : [course, ...s.courses],
          };
        }),

      setHoleImage: (courseId, holeNumber, imageUrl) =>
        set((s) => ({
          courses: updateHole(s.courses, courseId, holeNumber, (h) => ({
            ...h,
            imageUrl,
          })),
        })),

      setHoleShapes: (courseId, holeNumber, shapes) =>
        set((s) => ({
          courses: updateHole(s.courses, courseId, holeNumber, (h) => ({
            ...h,
            shapes,
          })),
        })),

      addMemo: (courseId, holeNumber, category, text) =>
        set((s) => {
          const memo: Memo = {
            id: uuid(),
            category,
            text: text.trim(),
            createdAt: now(),
            updatedAt: now(),
          };
          return {
            courses: updateHole(s.courses, courseId, holeNumber, (h) => ({
              ...h,
              memos: [memo, ...h.memos],
            })),
          };
        }),

      updateMemo: (courseId, holeNumber, memoId, text) =>
        set((s) => ({
          courses: updateHole(s.courses, courseId, holeNumber, (h) => ({
            ...h,
            memos: h.memos.map((m) =>
              m.id === memoId ? { ...m, text: text.trim(), updatedAt: now() } : m,
            ),
          })),
        })),

      deleteMemo: (courseId, holeNumber, memoId) =>
        set((s) => ({
          courses: updateHole(s.courses, courseId, holeNumber, (h) => ({
            ...h,
            memos: h.memos.filter((m) => m.id !== memoId),
          })),
        })),
    }),
    {
      name: 'greenbook-courses',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ courses: state.courses }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
