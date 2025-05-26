import { useMemo } from "react";
import { MaterialReactTable } from "material-react-table";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

const BookTable = ({ books, onEdit, categories, onDelete, isLoading }) => {
  // Define columns
  console.log("categories in book table", categories);

  const columns = useMemo(
    () => [
      {
        id: "sno",
        header: "S.No",
        Cell: ({ row }) => row.index + 1,
        size: 50,
      },
      {
        accessorKey: "coverUrl",
        header: "Cover",
        Cell: ({ cell }) => (
          <Box
            component="img"
            src={cell.getValue() || "/placeholder-book-cover.jpg"}
            alt="Book cover"
            sx={{ width: 50, height: 70, objectFit: "cover" }}
          />
        ),
        size: 80,
      },
      {
        accessorKey: "name",
        header: "Title",
        size: 200,
        filterVariant: "autocomplete",
      },
      {
        accessorKey: "writer",
        header: "Author",
        size: 150,
      },
      {
        accessorKey: "categories",
        header: "Categories",
        filterVariant: "select",
        filterSelectOptions: categories, // e.g., ["Biography", "Novel"]
        filterFn: (row, columnId, filterValue) => {
          const rowCategories = row.getValue(columnId);
          return Array.isArray(rowCategories)
            ? rowCategories.includes(filterValue)
            : false;
        },
        Cell: ({ cell }) => {
          const categories = cell.getValue() || [];
          return (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {categories.map((category) => (
                <Box
                  key={category}
                  sx={{
                    backgroundColor: "#e0f7fa",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    fontSize: "0.875rem",
                  }}
                >
                  {category}
                </Box>
              ))}
            </Box>
          );
        },
      },
      {
        accessorKey: "language",
        header: "Language",
        filterVariant: "select",
        filterSelectOptions: ["English", "Urdu"],
      },
      {
        accessorKey: "prices.pkr",
        header: "Price (PKR)",
        Cell: ({ cell }) => `₨. ${cell.getValue()?.toLocaleString()}`,
        size: 120,
      },
      {
        accessorKey: "prices.discountedPkr",
        header: "Discounted Price",
        Cell: ({ row }) => (
          <Box
            sx={{
              color:
                row.original.prices.discountedPkr < row.original.prices.pkr
                  ? "success.main"
                  : "inherit",
              fontWeight: "bold",
            }}
          >
            ₨{row.original.prices.discountedPkr.toLocaleString()}
          </Box>
        ),
        size: 150,
      },
      {
        accessorKey: "status",
        header: "Status",
        filterVariant: "select",
        filterSelectOptions: ["published", "draft"],
        Cell: ({ cell }) => (
          <Box
            component="span"
            sx={{
              color:
                cell.getValue() === "published"
                  ? "success.main"
                  : "warning.main",
              fontWeight: "bold",
              textTransform: "capitalize",
            }}
          >
            {cell.getValue()}
          </Box>
        ),
      },
      {
        accessorKey: "releaseDate",
        header: "Released Date",
        Cell: ({ cell }) => new Date(cell.getValue()).toLocaleDateString(),
      },
    ],
    []
  );

  return (
    <MaterialReactTable
      columns={columns}
      data={books}
      isLoading={isLoading}
      enableColumnFilters
      enablePagination
      enableSorting
      enableBottomToolbar
      enableTopToolbar
      enableRowActions
      positionActionsColumn="last"
      renderRowActions={({ row }) => (
        <Box sx={{ display: "flex", gap: "8px" }}>
          <Tooltip title="Edit">
            <IconButton onClick={() => onEdit(row.original)}>
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              color="error"
              onClick={() => {
                if (
                  window.confirm("Are you sure you want to delete this book?")
                ) {
                  onDelete(row.original.id);
                }
              }}
            >
              <Delete htmlColor="#ED1C24" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      initialState={{
        showColumnFilters: true,
        density: "compact",
      }}
      muiTablePaperProps={{
        sx: {
          borderRadius: "8px",
          boxShadow: "none",
          border: "1px solid #e0e0e0",
        },
      }}
      muiTableContainerProps={{
        sx: {
          height: "60%", // 👈 Fixed percentage height
          minHeight: "60dvh", // 👈 Optional fallback for very small screens
        },
      }}
    />
  );
};

export default BookTable;
