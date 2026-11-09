import React, { useState } from "react";
import { useFormik } from "formik";
import { SupervisorSchemas } from "../../../Schemas";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { Button } from "@material-tailwind/react";
import { useSelector } from "react-redux";
import { addDemoSupervisor, withOffline } from "../../../data/offlineLists";
const initialValues = {
  name: "",
  email: "",
  mobileNumber: "",
  dob: "",
};
const AddSupervisor = () => {
  const { _id } = useSelector((state) => state.user.user);
  const { SportComplexId } = useSelector((state) => state.user.user);
  const navigate = useNavigate();
  const [supervisor, setsupervisor] = useState(false);

  const submitHandler = (values) => {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify({
      Email: values.email,
      DOB: values.dob,
      ContactNum: values.mobileNumber,
      Role: 1,
      Name: values.name,
      createdBy: _id,
      SportComplexId: SportComplexId,
    });

    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };

    withOffline(
      fetch("http://localhost:9999/signup", requestOptions).then((response) => {
        if (!response.ok) throw new Error("offline");
        return response.json();
      }),
      { offline: true }
    ).then((result) => {
      if (!result || result.offline || (result.rcode && result.rcode !== 200)) {
        addDemoSupervisor({
          _id: `sup-${Date.now()}`,
          Name: values.name,
          ContactNum: values.mobileNumber,
          Email: values.email,
          CreatedAt: new Date().toISOString().slice(0, 10),
          date: new Date().toISOString().slice(0, 10),
        });
      }
      setsupervisor(!supervisor);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Supervisor added",
        showConfirmButton: false,
        timer: 1500,
      });
      navigate("/manager/allsupervisor");
    });
  };

  const { values, errors, touched, handleBlur, handleChange, handleSubmit } =
    useFormik({
      initialValues: initialValues,
      validationSchema: SupervisorSchemas,
      onSubmit: (values, action) => {
        console.log(values);
        submitHandler(values);
        action.resetForm();
      },
    });
  return (
    <>
    <div className="px-4 py-6 sm:px-6">
      <div className="flex  mx-5">
        <Button
          className="items-end cta-btn font-semibold py-4 mt-5 rounded-br-lg rounded-bl-lg rounded-tr-lg shadow-lg hover:shadow-xl "
          onClick={() => {
            navigate(-1);
          }}
        >
          Back
        </Button>
      </div>
      <div className="flex items-center justify-center m-5">
        <div className="w-full max-w-2xl">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-brand-dark">
            Add New Supervisor
          </h2>
          <form
            onSubmit={handleSubmit}
            className="mt-5 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8"
          >
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="name"
              >
                Name
              </label>
              <input
                className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                name="name"
                type="text"
                placeholder="Name"
                value={values.name}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {errors.name && touched.name ? (
                <small className="text-ligth text-red-600">{errors.name}</small>
              ) : null}
            </div>
            <div className="mb-4">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="email"
              >
                Email
              </label>
              <input
                className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                name="email"
                type="text"
                placeholder="Enter Your Email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {errors.email && touched.email ? (
                <small className="text-ligth text-red-600">
                  {errors.email}
                </small>
              ) : null}
            </div>
            <div className="mb-6">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="mobileNumber"
              >
                Mobile Number
              </label>
              <input
                name="mobileNumber"
                type="number"
                value={values.mobileNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter Number"
                className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              ></input>
              {errors.mobileNumber && touched.mobileNumber ? (
                <small className="text-ligth text-red-600">
                  {errors.mobileNumber}
                </small>
              ) : null}
            </div>
            <div className="mb-6">
              <label
                className="block text-gray-700 text-sm font-bold mb-2"
                htmlFor="dob"
              >
                Date of Birth
              </label>
              <input
                name="dob"
                type="date"
                value={values.dob}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter Number"
                className="w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
              ></input>
              {errors.dob && touched.dob ? (
                <small className="text-ligth text-red-600">{errors.dob}</small>
              ) : null}
            </div>

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

export default AddSupervisor;

