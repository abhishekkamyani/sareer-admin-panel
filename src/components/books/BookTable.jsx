import { useMemo } from "react";
import { MaterialReactTable } from "material-react-table";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

const BookTable = ({ books, onEdit, onDelete, isLoading }) => {
  // Define columns
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
        accessorKey: "category",
        header: "Category",
        filterVariant: "select",
        filterSelectOptions: [
          "New Arrival",
          "Novel",
          "Short Stories",
          "Biography",
          "Poetry",
          "History",
        ],
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
        Cell: ({ cell }) => `₨. ${cell.getValue().toLocaleString()}`,
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
              <Delete />
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
          height: '60%',       // 👈 Fixed percentage height
          minHeight: '60dvh',  // 👈 Optional fallback for very small screens
        },
      }}
      
    />
  );
};

export default BookTable;
