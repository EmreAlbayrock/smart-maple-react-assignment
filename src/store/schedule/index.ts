/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Action } from "redux-actions";

import { handleActions } from "redux-actions";

import types from "./types";

import type { ScheduleInstance } from "../../models/schedule";
import type { ErrorBE } from "../../utils/types";

export interface ScheduleState {
  errors: ErrorBE;
  loading: boolean;
  schedule: ScheduleInstance;
}

const initialState: ScheduleState = {
  loading: false,
  errors: {},
  schedule: {} as ScheduleInstance,
};

const scheduleReducer: any = {
  [types.FETCH_SCHEDULE_SUCCESS]: (
    state: ScheduleState,
    { payload }: Action<typeof state.schedule>
  ): ScheduleState => ({
    ...state,
    loading: false,
    errors: {},
    schedule: payload,
  }),

  [types.FETCH_SCHEDULE_FAILED]: (
    state: ScheduleState,
    { payload }: Action<typeof state.errors>
  ): ScheduleState => ({
    ...state,
    loading: false,
    errors: payload,
  }),

  [types.UPDATE_ASSIGNMENT_DATE]: (
    state: ScheduleState,
    {
      payload,
    }: Action<{
      assignmentId: string;
      newShiftStart: string;
      newShiftEnd: string;
    }>
  ): ScheduleState => {
    const { assignmentId, newShiftStart, newShiftEnd } = payload;

    return {
      ...state,
      schedule: {
        ...state.schedule,
        assignments: state.schedule.assignments.map((assignment) =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                shiftStart: newShiftStart,
                shiftEnd: newShiftEnd,
                isUpdated: true,
              }
            : assignment
        ),
      },
    };
  },
};

export default handleActions(scheduleReducer, initialState) as any;
