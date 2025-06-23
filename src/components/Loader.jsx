import { LoadingOutlined } from "@ant-design/icons";
import { Spin } from "antd";

const antIcon = (
  <LoadingOutlined style={{ fontSize: 50, color: "#2BB673" }} spin />
);

export const Loader = () => {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-1/2">
      <Spin indicator={antIcon} />
    </div>
  );
};
