import { Row, Col, Card, Empty, Button, Pagination } from "antd";
import ScanCard from "../ScanCard";

export default function ScanResults({
  scans,
  loading,
  total,
  page,
  setPage,
  PAGE_SIZE,
  screens,
  clearAllFilters,
  renderSkeletons,
  query,
  viewMode,
}) {
  if (loading) return renderSkeletons();

  if (scans.length === 0)
    return (
      <Card>
        <Empty description="No scan results found">
          <Button type="primary" onClick={clearAllFilters}>
            Clear All Filters
          </Button>
        </Empty>
      </Card>
    );

  return (
    <>
      <Row gutter={[16, 16]}>
        {scans.map((scan) => (
          <Col key={scan.id} xs={24}>
            <ScanCard scan={scan} highlightQuery={query} viewMode={viewMode} />
          </Col>
        ))}
      </Row>

      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <Pagination
          current={page}
          total={total}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          showSizeChanger
          size={screens.xs ? "small" : "default"}
        />
      </div>
    </>
  );
}
