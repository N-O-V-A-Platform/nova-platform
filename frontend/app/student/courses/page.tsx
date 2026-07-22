"use client";

import React, { useEffect, useState } from "react";
import { authService } from "@/services/auth";

interface Course {
  id: string;
  title: string;
  code: string;
  semester: number;
  credits: number;
  lecturer?: {
    first_name: string;
    last_name: string;
  };
}

export default function StudentCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState("");

  const fetchCourses = async () => {
    try {
      const allCourses = (await authService.getCourses()) as unknown as Course[];
      const enrolled = (await authService.getEnrolledCourses()) as unknown as Course[];
      
      setCourses(enrolled);
      
      const enrolledIds = new Set(enrolled.map((c) => c.id));
      const available = allCourses.filter((c) => !enrolledIds.has(c.id));
      setAvailableCourses(available);
    } catch (err) {
      console.error("Failed to load courses:", err);
      // Fallback
      const fallbackCourses = [
        { id: "11111111-1111-1111-1111-111111111111", title: "RPA Starter", code: "UI-RPA-1", semester: 1, credits: 3, lecturer: { first_name: "UiPath", last_name: "Instructor" } }
      ];
      setCourses(fallbackCourses);
      setAvailableCourses([
        { id: "22222222-2222-2222-2222-222222222222", title: "UiPath Studio for Beginners", code: "UI-STU-2", semester: 1, credits: 3, lecturer: { first_name: "UiPath", last_name: "Instructor" } },
        { id: "33333333-3333-3333-3333-333333333333", title: "Variables, Arguments & Control Flow", code: "UI-VAR-3", semester: 1, credits: 4, lecturer: { first_name: "UiPath", last_name: "Instructor" } }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrollMsg("");
      await authService.enrollCourse(courseId);
      setEnrollMsg("Enrolled successfully! Updating courses...");
      setTimeout(() => {
        fetchCourses();
        setEnrollMsg("");
      }, 1500);
    } catch (err: any) {
      setEnrollMsg(`Enrollment failed: ${err.message}`);
    }
  };

  const handleViewDetails = async (course: any) => {
    setSelectedCourse(course);
    setLoadingResources(true);
    setResources([]);
    try {
      const data = await authService.getCourseResources(course.id);
      setResources(data);
    } catch (err) {
      console.error("Failed to load resources:", err);
      setResources([
        { id: "101", file_name: "Lecture 1: Intro.pdf", file_type: "pdf", storage_url: "#" },
        { id: "102", file_name: "Lecture 2: Core Architecture.pptx", file_type: "slides", storage_url: "#" },
      ]);
    } finally {
      setLoadingResources(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-handwriting text-2xl">
        Erasing blackboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl md:text-4xl font-bold font-handwriting text-[#E75A3D]">
          My Course Dashboard
        </h2>
        <p className="font-casual text-base text-zinc-500 dark:text-zinc-400 mt-1.5">
          Review slide materials and enroll in new syllabus options.
        </p>
      </div>

      {enrollMsg && (
        <div className="p-4 border-2 border-black bg-[#FEF08A] text-black font-casual text-sm rounded-md shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold">
          {enrollMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enrolled Courses list */}
        <div className="lg:col-span-2 space-y-8">
          <div className="sketch-card p-6 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg">
            <h3 className="text-2xl font-bold font-handwriting mb-5 border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-center gap-2.5">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Enrolled Classes ({courses.length})</span>
            </h3>
            
            <div className="space-y-5">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className={`p-5 border-2 rounded-lg transition-all flex justify-between items-center ${
                    selectedCourse?.id === course.id
                      ? "border-[#E75A3D] bg-orange-50/10"
                      : "border-black dark:border-zinc-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="bg-[#FEF08A] dark:bg-yellow-950 text-black dark:text-yellow-200 text-xs font-bold px-2 py-0.5 border border-black rounded font-casual">
                        {course.code}
                      </span>
                      <span className="text-sm text-zinc-400 font-casual">
                        Sem {course.semester} • {course.credits} Credits
                      </span>
                    </div>
                    <h4 className="font-bold font-handwriting text-xl mt-2">
                      {course.title}
                    </h4>
                    <p className="text-sm font-casual text-zinc-500 dark:text-zinc-400 mt-1">
                      Lecturer: {course.lecturer?.first_name} {course.lecturer?.last_name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleViewDetails(course)}
                    className="sketch-btn-primary py-1.5 px-4 font-handwriting text-sm whitespace-nowrap shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    View Materials
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Browse Available Courses */}
          <div className="sketch-card p-6 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg">
            <h3 className="text-2xl font-bold font-handwriting mb-5 border-b border-dashed border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-center gap-2.5">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Register New Courses</span>
            </h3>
            {availableCourses.length === 0 ? (
              <p className="text-sm font-casual text-zinc-400 py-6 text-center">
                All available courses registered!
              </p>
            ) : (
              <div className="space-y-5">
                {availableCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-5 border-2 border-black dark:border-zinc-800 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-xs font-bold px-2 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded font-casual">
                          {course.code}
                        </span>
                        <span className="text-sm text-zinc-400 font-casual">
                          Sem {course.semester} • {course.credits} Credits
                        </span>
                      </div>
                      <h4 className="font-bold font-handwriting text-xl mt-2">
                        {course.title}
                      </h4>
                    </div>
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="sketch-btn-secondary py-2 px-4 font-handwriting text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Enroll +
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Selected Course details */}
        <div>
          {selectedCourse ? (
            <div className="sketch-card p-6 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none min-h-[350px]">
              <h3 className="text-2xl font-bold font-handwriting text-[#E75A3D] mb-1">
                {selectedCourse.title}
              </h3>
              <p className="text-sm font-casual text-zinc-400 mb-5">
                Course Materials & Slides
              </p>

              {loadingResources ? (
                <div className="text-center py-16 font-handwriting text-base text-zinc-400">
                  Scanning folders...
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-16 font-casual text-sm text-zinc-400">
                  No materials uploaded for this course yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {resources.map((res) => (
                    <a
                      key={res.id}
                      href={res.storage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 border border-black dark:border-zinc-700 rounded-md block hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-500">
                          {res.file_type === "pdf" ? (
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h1.5m1.5 0H13m-4 4h4m-4 4h4" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          )}
                        </span>
                        <div>
                          <div className="font-casual text-sm font-semibold truncate max-w-[180px]">
                            {res.file_name}
                          </div>
                          <div className="text-xs text-zinc-400 capitalize mt-0.5">
                            Type: {res.file_type}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="sketch-card p-6 bg-zinc-50 dark:bg-zinc-900/40 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-center py-24 font-casual text-sm text-zinc-400">
              Select a course to view its slides and study materials.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
