/**
 * Rating.stories.tsx — Étoiles @reui pour évaluations / coachings.
 */
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Rating } from "src/index";

type Story = StoryObj;

const meta: Meta = {
  title: "Aurora/UI/Rating (@reui)",
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};
export default meta;

export const Lecture: Story = {
  render: function RatingLecture() {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Note moyenne</span>
          <Rating rating={4.2} showValue />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Avec 4/5</span>
          <Rating rating={4} />
        </div>
      </div>
    );
  },
};

export const Editable: Story = {
  render: function RatingEditable() {
    const [rating, setRating] = useState(3);
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <div className="flex items-center gap-3">
          <span className="text-sm">Note : {rating}/5</span>
          <Rating rating={rating} editable onRatingChange={setRating} />
        </div>
      </div>
    );
  },
};
