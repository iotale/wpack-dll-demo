function List(props) {
  const { dataSource = [] } = props;
  return (
    <ul>
      {dataSource.map(item => <li key={item.id}>{item.text}</li>)}
    </ul>
  );
}

export default List;
