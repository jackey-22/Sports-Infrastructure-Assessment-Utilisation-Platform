import React from "react";
import { useFormik } from "formik";
import { compalintSchemas } from "../../../Schemas";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { Button, Card, Field, PageHeader, PageShell, inputClass, selectClass } from "../Common/ManagerUI";
import { registerComplaint } from "../../../data/demoComplaints";
import { withOffline } from "../../../data/offlineLists";

const initialValues = {
  type: "",
  description: "",
  Thumbnail: [],
};

const ManagerAddComplaint = () => {
  const navigate = useNavigate();
  const ComplaintType = useSelector((s) => s.complaintType.complaintType) || [];
  const user = useSelector((s) => s.user.user) || {};
  const { _id, SportComplexId, Name } = user;

  const handleOneFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFieldValue("Thumbnail", selectedFiles);
  };

  const submitHandler = async (values, actions) => {
    if (!_id || !SportComplexId) {
      actions.setSubmitting(false);
      Swal.fire({
        icon: "error",
        title: "Cannot submit",
        text: "Your manager session or sports complex is unavailable. Please log in again.",
      });
      return;
    }

    const formdata = new FormData();
    formdata.append("type", values.type);
    formdata.append("Description", values.description);
    formdata.append("userId", _id);
    formdata.append("sportsComplex", SportComplexId);
    formdata.append("level", "2");
    formdata.append("status", "0");
    if (values.Thumbnail[0]) {
      formdata.append("picture", values.Thumbnail[0], values.Thumbnail[0].name);
    }

    const result = await withOffline(
      fetch("http://localhost:9999/addComplaint", {
        method: "POST",
        body: formdata,
        redirect: "follow",
      }).then((response) => {
        if (!response.ok) throw new Error("offline");
        return response.json();
      }),
      { offline: true }
    );

    if (!result || result.offline || result.rcode !== 200) {
      registerComplaint({
        description: values.description,
        typeId: values.type,
        raisedBy: "manager",
        citizenName: Name || "Facility manager",
        role: 3,
        level: 2,
        forCitizen: false,
      });
    }

    actions.setSubmitting(false);
    Swal.fire({
      position: "top-end",
      icon: "success",
      title: "Grievance sent to the district authority",
      showConfirmButton: false,
      timer: 1500,
    });
    navigate("/manager/allcomplaint?tab=mine");
  };

  const {
    values,
    errors,
    touched,
    handleBlur,
    handleChange,
    handleSubmit,
    isSubmitting,
    setFieldValue,
  } = useFormik({
    initialValues,
    validationSchema: compalintSchemas,
    onSubmit: submitHandler,
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager"
        title="Submit a grievance"
        description="Send a facility complaint to the district authority. A photo helps the inspection."
      />
      <Card>
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-4 px-5 py-6 sm:px-8">
          <Field label="Complaint type" htmlFor="type">
            <select
              name="type"
              id="type"
              value={values.type}
              className={selectClass}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value="">Select a type</option>
              {ComplaintType.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.Type}
                </option>
              ))}
            </select>
            {errors.type && touched.type ? (
              <p className="mt-1 text-xs font-semibold text-red-700">{errors.type}</p>
            ) : null}
          </Field>

          <Field label="Description" htmlFor="description" hint="What is wrong, and where in the complex.">
            <textarea
              className={`${inputClass} min-h-28`}
              name="description"
              id="description"
              placeholder="Describe the issue"
              value={values.description}
              onChange={handleChange}
              onBlur={handleBlur}
            />
            {errors.description && touched.description ? (
              <p className="mt-1 text-xs font-semibold text-red-700">{errors.description}</p>
            ) : null}
          </Field>

          <Field label="Photograph" htmlFor="fileInput" hint="JPEG or PNG. Optional.">
            <input
              className={inputClass}
              name="Thumbnail"
              type="file"
              id="fileInput"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleOneFileChange}
              onBlur={handleBlur}
            />
            {errors.Thumbnail && touched.Thumbnail ? (
              <p className="mt-1 text-xs font-semibold text-red-700">{errors.Thumbnail}</p>
            ) : null}
          </Field>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting…" : "Submit grievance"}
            </Button>
          </div>
        </form>
      </Card>
    </PageShell>
  );
};

export default ManagerAddComplaint;
