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

  const fetchCourses = async (newEnrollId?: string) => {
    try {
      const allCourses = (await authService.getCourses()) as unknown as Course[];
      const enrolled = (await authService.getEnrolledCourses()) as unknown as Course[];

      setCourses(enrolled);
      if (enrolled.length > 0 && !selectedCourse) {
        handleViewDetails(enrolled[0]);
      }

      const enrolledIds = new Set(enrolled.map((c) => c.id));
      const available = allCourses.filter((c) => !enrolledIds.has(c.id));
      setAvailableCourses(available);

      if (newEnrollId) {
        const newlyEnrolled = enrolled.find((c) => c.id === newEnrollId);
        if (newlyEnrolled) {
          handleViewDetails(newlyEnrolled);
        }
      }
    } catch (err) {
      console.error("Failed to load courses:", err);
      const fallbackCourses = [
        { id: "11111111-1111-1111-1111-111111111111", title: "Artificial Intelligence Essentials", code: "CS-AI-101", semester: 1, credits: 4, lecturer: { first_name: "Dr. Sarah", last_name: "Chen" } }
      ];
      setCourses(fallbackCourses);
      setSelectedCourse(fallbackCourses[0]);
      setAvailableCourses([
        { id: "22222222-2222-2222-2222-222222222222", title: "Data Structures & Algorithms", code: "CS-DSA-201", semester: 1, credits: 4, lecturer: { first_name: "Prof. Alan", last_name: "Turing" } },
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
      setEnrollMsg("Enrolled successfully!");
      setTimeout(() => {
        fetchCourses(courseId);
        setEnrollMsg("");
      }, 800);
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
        { id: "101", file_name: "Lecture 1: Core Fundamentals.pdf", file_type: "pdf", storage_url: "#" },
        { id: "102", file_name: "Lecture 2: Slide Deck Architecture.pptx", file_type: "slides", storage_url: "#" },
      ]);
    } finally {
      setLoadingResources(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-handwriting text-2xl">
        Loading Course Hub...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 border-2 border-black rounded-xl">
        <div>
          <h2 className="text-2xl font-bold font-handwriting text-[#E75A3D]">
            Course Dashboard & Slide Repository
          </h2>
          <p className="font-casual text-xs text-zinc-500 mt-0.5">
            Select courses to inspect lecture slides and grounded materials for AI Teacher sessions.
          </p>
        </div>
      </div>

      {enrollMsg && (
        <div className="p-3 border-2 border-black bg-[#FEF08A] text-black font-casual text-xs rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">
          {enrollMsg}
        </div>
      )}

      {/* 3-Column Compact Layout fitting on screen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Col 1: Enrolled Courses */}
        <div className="sketch-card p-4 bg-white dark:bg-zinc-900 border-2 border-black rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold font-handwriting mb-3 border-b-2 border-black pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>My Classes</span>
              </span>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                {courses.length}
              </span>
            </h3>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {courses.map((course) => {
                const isSelected = selectedCourse?.id === course.id;
                return (
                  <div
                    key={course.id}
                    onClick={() => handleViewDetails(course)}
                    className={`p-3 border-2 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#E75A3D] bg-orange-50/40 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        : "border-black hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="bg-[#FEF08A] text-black text-[10px] font-bold px-1.5 py-0.5 border border-black rounded font-casual">
                        {course.code}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-casual">
                        Sem {course.semester} • {course.credits} Credits
                      </span>
                    </div>
                    <h4 className="font-bold font-handwriting text-base mt-1 text-black dark:text-white leading-snug">
                      {course.title}
                    </h4>
                    <p className="text-xs font-casual text-zinc-500 mt-0.5">
                      {course.lecturer?.first_name ? `Lecturer: ${course.lecturer.first_name} ${course.lecturer.last_name}` : "Faculty Assigned"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Col 2: Register New Courses */}
        <div className="sketch-card p-4 bg-white dark:bg-zinc-900 border-2 border-black rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold font-handwriting mb-3 border-b-2 border-black pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#E75A3D]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Available Catalog</span>
              </span>
              <span className="text-xs bg-orange-100 dark:bg-orange-950 text-[#E75A3D] px-2 py-0.5 rounded font-mono font-bold">
                {availableCourses.length}
              </span>
            </h3>

            {availableCourses.length === 0 ? (
              <p className="text-xs font-casual text-zinc-400 py-10 text-center italic">
                All catalog courses registered!
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {availableCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-3 border-2 border-black rounded-lg flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold px-1.5 py-0.5 border border-black rounded font-casual">
                        {course.code}
                      </span>
                      <h4 className="font-bold font-handwriting text-sm mt-1 text-black dark:text-white leading-snug">
                        {course.title}
                      </h4>
                    </div>
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="sketch-btn-secondary py-1 px-3 font-handwriting text-xs font-bold whitespace-nowrap"
                    >
                      Enroll +
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Col 3: Selected Course Slides & Resources */}
        <div className="sketch-card p-4 bg-white dark:bg-zinc-900 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {selectedCourse ? (
            <div>
              <div className="border-b-2 border-black pb-2 mb-3">
                <span className="text-[10px] text-[#E75A3D] font-mono font-bold uppercase tracking-wider">
                  Course Material Inspection
                </span>
                <h3 className="text-xl font-bold font-handwriting text-black dark:text-white leading-tight">
                  {selectedCourse.title}
                </h3>
              </div>

              {loadingResources ? (
                <div className="text-center py-12 font-handwriting text-sm text-zinc-400">
                  Scanning lecture slides...
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-12 font-casual text-xs text-zinc-400 italic">
                  No slides uploaded for this course yet.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                  {resources.map((res) => (
                    <a
                      key={res.id}
                      href={res.storage_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 border-2 border-black rounded-lg block hover:bg-yellow-50/50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="shrink-0">
                          {res.file_type === "pdf" ? (
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-casual text-xs font-bold text-black dark:text-white truncate">
                            {res.file_name}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">
                            {res.file_type || "DOCUMENT"}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 font-casual text-xs text-zinc-400 italic">
              Select a class on the left to inspect its slides.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
