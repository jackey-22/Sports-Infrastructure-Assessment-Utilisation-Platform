import React, { useState, useEffect } from "react";
import "primereact/resources/themes/lara-light-indigo/theme.css";
import LoadError from "../../Common/LoadError";
import { FilterMatchMode } from "primereact/api";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { useSelector } from "react-redux/es/hooks/useSelector";
import { Link } from "react-router-dom";
import { ManagerService } from "./ManagerService";

export default function ManagerDateTable() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [customers, setCustomers] = useState(null);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);
  // let district = [];
  // district = useSelector((state) => state.district.districts);
  const [globalFilterValues, setGlobalFilterValues] = useState({
    Name: "",
    ContactNum: "",
    Email: "",
    District: "",
  });

  const Authoritydata = useSelector((state) => state.user.user);
  useEffect(() => {
    ManagerService.getCustomersXLarge(Authoritydata._id).then((data) => {
      setCustomers(getCustomers(data));
      setLoadError(false);
      setLoading(false);
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
    });
    initFilters();
  }, [refreshKey]);

  const getCustomers = (data) => {
    return [...(data || [])].map((d) => {
      d.date = new Date(d.date);
      // d.District = getDistrictName(d.DistrictId);
      return d;
    });
  };

  const clearFilter = () => {
    initFilters();
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    let _filters = { ...filters };

    _filters["global"].value = value;
    // Update the global filter value for all fields
    setGlobalFilterValues({
      Name: value,
      ContactNum: value,
      Email: value,
      District: value,
    });

    setFilters(_filters);
  };

  const initFilters = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });

    // Set the global filter values for all fields to empty strings
    setGlobalFilterValues({
      Name: "",
      ContactNum: "",
      Email: "",
      District: "",
    });
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between mr-2">
        <Button
          type="button"
          label="Clear"
          outlined
          className="px-4 py-2 rounded-lg text-blue-800 ring-0 border-2 border-blue-700 hover:bg-gray-200"
          onClick={clearFilter}
        />
        <span className="p-input-icon-left">
          <InputText
            value={globalFilterValues.Name}
            onChange={onGlobalFilterChange}
            placeholder="Keyword Search"
            className="p-2 ring-1 ring-opacity-50 ring-black focus:ring-blue-600 focus:ring-2 focus:ring-opacity-70 hover:ring-opacity-100 hover:ring-blue-400"
          />
        </span>
      </div>
    );
  };

  const dateBodyTemplate = (rowData) => {
    const date = new Date(rowData.CreatedAt);
    return formatDate(date);
  };

  const formatDate = (value) => {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return "";
  };

  const dateFilterTemplate = (options) => {
    return (
      <Calendar
        value={options.value}
        onChange={(e) => options.filterCallback(e.value, options.index)}
        dateFormat="mm/dd/yy"
        placeholder="mm/dd/yyyy"
        mask="99/99/9999"
      />
    );
  };

  const actionBodyTemplate = (rowData) => {
    return (
      <div className="flex justify-between">
        <Link to={"/admin/blogsedit"} state={{ data: rowData }}>
          <button
            type="button"
            className="text-blue-500 hover:text-blue-700 p-1"
          >
            {/* Your SVG icon for editing */}
          </button>
        </Link>
      </div>
    );
  };

  const header = renderHeader();
  const [first, setFirst] = useState(0);

  const calculateIndex = (currentPage, rowIndex) => {
    return currentPage * 10 + rowIndex + 1;
  };

  const representativeBodyTemplate = (rowData) => {
    return rowData.Category.join(", ");
  };

  // const DistrictBodyTemplete = (rowdata) => {
  //   const data = district.find((c) => c._id === rowdata.DistrictId);
  //   return data.District;
  // };

  // const getDistrictName = (id) => {
  //   const data = district.find((c) => c._id === id);
  //   return data.District;
  // };

  return (
    <div className="card">
      {loadError && <LoadError onRetry={() => setRefreshKey((k) => k + 1)} />}
      <DataTable
        value={customers}
        paginator
        showGridlines
        stripedRows
        rows={10}
        rowsPerPageOptions={[10, 25, 50]}
        loading={loading}
        dataKey="_id"
        filters={filters}
        globalFilterFields={[
          "Name",
          "ContactNum",
          "Email",
          "SportComplexId.name",
        ]}
        header={header}
        emptyMessage="No Blogs found."
      >
        <Column
          field="index"
          header="Index"
          style={{ width: "4rem" }}
          body={(rowData) => {
            const rowIndex = customers.indexOf(rowData);
            return calculateIndex(Math.floor(first / 10), rowIndex);
          }}
        />

        <Column
          header="Name"
          field="Name"
          filterField="Name"
          style={{ minWidth: "12rem" }}
        />
        <Column
          header="Contact Number"
          field="ContactNum"
          filterField="ContactNum"
          style={{ minWidth: "12rem" }}
        />
        <Column
          header="Email"
          field="Email"
          filterField="Email"
          style={{ minWidth: "12rem" }}
        />
        <Column
          header="Sports Complex"
          field="SportComplexId.name" // Replace 'districtName' with the actual field name
          //   filterField="District" // Make sure this matches the actual field name
          style={{ minWidth: "12rem" }}
          // body={DistrictBodyTemplete}
          //   filterMatchMode={FilterMatchMode.CONTAINS}
          //   filterValue={globalFilterValues.District}
        />
      </DataTable>
    </div>
  );
}
