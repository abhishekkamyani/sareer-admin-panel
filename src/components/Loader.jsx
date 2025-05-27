import { LoadingOutlined } from "@ant-design/icons";
import { Spin } from "antd";

const antIcon = (
  <LoadingOutlined style={{ fontSize: 50, color: "#2BB673" }} spin />
);

export const Loader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <Spin indicator={antIcon} />
    </div>
  );
};
