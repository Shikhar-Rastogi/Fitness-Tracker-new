import React, { useState } from "react";
import styled from "styled-components";
import TextInput from "./TextInput";
import Button from "./Button";

const Card = styled.div`
  flex: 1;
  min-width: 280px;
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.text_primary + 20};
  border-radius: 14px;
  box-shadow: 1px 6px 20px 0px ${({ theme }) => theme.primary + 15};
  display: flex;
  flex-direction: column;
  gap: 6px;
  @media (max-width: 600px) {
    padding: 16px;
  }
`;
const Title = styled.div`
  font-weight: 600;
  font-size: 16px;
  color: ${({ theme }) => theme.primary};
  @media (max-width: 600px) {
    font-size: 14px;
  }
`;
const  workoutParameter = [
  "category",
  "workoutName",
  "sets",
  "reps",
  "weight",
  "duration",
  "caloriesBurned",
];

const AddWorkout = ({ workout, setWorkout, addNewWorkout, buttonLoading }) => {
  const [workParameter, setWorkParameter] = useState([]);

  const handleWorkout = (e) => {
    const property = e.target.name;
    const value = e.target.value;
    const newValue = {
      [property]: value,
    };
    setWorkParameter([...workParameter, newValue]);
    setWorkout(
      workParameter.reduce((a, v) => {
        return Object.assign(a, v);
      }, {})
    );
  };

  return (
    <Card>
      <Title>Add New Workout</Title>
      {workoutParameter.map((work) => {
        return (
          <TextInput
            name={work}
            label={work.toUpperCase()}
            rows={10}
            value={workout?.work}
            placeholder={"Enter respective value"}
            handleChange={(e) => handleWorkout(e)}
          />
        );
      })}
      <Button
        text="Add Workout"
        small
        onClick={() => addNewWorkout()}
        isLoading={buttonLoading}
        isDisabled={buttonLoading}
      />
    </Card>
  );
};

export default AddWorkout;
