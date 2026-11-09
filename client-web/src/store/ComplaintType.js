import { createSlice } from "@reduxjs/toolkit";
const initialValues = {
  complaintType: [],
};

const ComplaintTypeSlice = createSlice({
  name: "complaintType",
  initialState: initialValues,
  reducers: {
    getcomplaintType(state, action) {
      const next = action.payload;
      if (!next || !next._id) return;
      const index = state.complaintType.findIndex((item) => item._id === next._id);
      if (index === -1) state.complaintType.push(next);
      else state.complaintType[index] = next;
    },
  },
});

export const ComplaintTypeActions = ComplaintTypeSlice.actions;
export default ComplaintTypeSlice.reducer;
