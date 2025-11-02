"use client";

import React, { useState } from "react";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { ticketApi } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";

const FloatingTicketButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to submit a ticket");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a title for your ticket");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await ticketApi.create({
        user_id: user.user_id,
        title: title.trim(),
        description: description.trim() || undefined
      });

      if (response.success) {
        toast.success("Ticket submitted successfully!");
        setTitle("");
        setDescription("");
        setIsOpen(false);
      } else {
        throw new Error(response.message || "Failed to submit ticket");
      }
    } catch (error: any) {
      console.error("Error submitting ticket:", error);
      toast.error(error.message || "Failed to submit ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 bg-[#4B0B14] text-white p-4 rounded-full shadow-lg hover:bg-[#60101C] transition-all z-40"
        aria-label="Report an issue"
      >
        <PlusCircleIcon className="h-8 w-8" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Report an Issue</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B0B14]"
                    placeholder="Briefly describe your issue"
                    maxLength={100}
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B0B14]"
                    placeholder="Provide detailed information about your issue"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 text-white rounded-md transition ${
                      isSubmitting 
                        ? "bg-gray-400 cursor-not-allowed" 
                        : "bg-[#4B0B14] hover:bg-[#60101C]"
                    }`}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingTicketButton;