import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { Button } from "@material-tailwind/react";
import { useSelector } from "react-redux";
import { eventSchemas } from "../../../Schemas";
import { addDemoNews, withOffline } from "../../../data/offlineLists";
const initialValues = {
  Title: "",
  Image: [],
  Description: "",
};
const AddComplexNews = () => {
  const { SportComplexId } = useSelector((state) => state.user.user);

  const navigate = useNavigate();

  const handleOneFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFieldValue("Image", selectedFiles);
  };

  // submit handler

  const submitHandler = (values) => {
    var formdata = new FormData();
    var fileInput = document.getElementById("fileInput");
    formdata.append("title", values.Title);
    formdata.append("description", values.Description);
    if (fileInput && fileInput.files && fileInput.files[0]) {
      formdata.append("image", fileInput.files[0], fileInput.files[0].name);
    }
    formdata.append("level", 2);
    formdata.append("sportComplexId", SportComplexId);

    var requestOptions = {
      method: "POST",
      body: formdata,
      redirect: "follow",
    };

    withOffline(
      fetch("http://localhost:9999/addUpdates", requestOptions).then((response) => {
        if (!response.ok) throw new Error("offline");
        return response.json();
      }),
      { offline: true }
    ).then((result) => {
      if (!result || result.offline || (result.rcode && result.rcode !== 200)) {
        addDemoNews({
          _id: `news-${Date.now()}`,
          title: values.Title,
          description: values.Description,
          image: "",
          active: "1",
          date: new Date().toISOString().slice(0, 10),
        });
      }
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Update added",
        showConfirmButton: false,
        timer: 1500,
      });
      navigate("/manager/complexevents");
    });
  };

  const {
    values,
    errors,
    touched,
    handleBlur,
    handleChange,
    handleSubmit,
    setFieldValue,
  } = useFormik({
    initialValues: initialValues,
    validationSchema: eventSchemas,
    onSubmit: (values, action) => {
      console.log(values);
      submitHandler(values);
      // action.resetForm();
    },
  });
  return (
    <>
    <div className="px-4 py-6 sm:px-6">
      <div className="flex mx-5">
        <Button
          className="items-end cta-btn font-semibold py-4 mt-5 rounded-br-lg rounded-bl-lg rounded-tr-lg shadow-lg hover:shadow-xl "
          onClick={() => {
            navigate(-1);
          }}
        >
          Back
        </Button>
      </div>
      <div className="flex items-center justify-center m-5 ">
        <div className="w-full max-w-2xl">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-brand-dark">
            Add New Events
          </h2>
          <form
            onSubmit={handleSubmit}
            className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8"
          >
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="Title"
              >
                Title
              </label>
              <input
                className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                name="Title"
                type="text"
                placeholder="Title"
                value={values.Title}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {errors.Title && touched.Title ? (
                <small className="text-ligth text-red-600">
                  {errors.Title}
                </small>
              ) : null}
            </div>
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="Description"
              >
                Description
              </label>
              <input
                className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                name="Description"
                type="text"
                placeholder="Description"
                value={values.Description}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {errors.Description && touched.Description ? (
                <small className="text-ligth text-red-600">
                  {errors.Description}
                </small>
              ) : null}
            </div>
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="Image"
              >
                Image
              </label>
              <input
                className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                name="Image"
                type="file"
                id="fileInput"
                accept="image/*"
                onChange={handleOneFileChange}
                onBlur={handleBlur}
                multiple
              />
            </div>
            {errors.Image && touched.Image ? (
              <small className="text-ligth text-red-600">{errors.Image}</small>
            ) : null}

            <div className="flex items-center justify-center">
              <button
                className="min-h-11 rounded-lg bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
                type="submit"
                // onClick={console.log("Hello")}
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
      </div>
    </>
  );
};

export default AddComplexNews;

