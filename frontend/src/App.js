/* https://reactjs.org/docs/hooks-intro.html
https://mui.com/material-ui/react-list/
https://mui.com/material-ui/getting-started/usage/
https://github.com/mui/material-ui
https://stackoverflow.com/questions/53219113/where-can-i-make-api-call-with-hooks-in-react
might be useful to look at https://mui.com/material-ui/guides/composition/#link
referred to by https://stackoverflow.com/questions/63216730/can-you-use-material-ui-link-with-react-router-dom-link
*/
import React, {useState, useReducer, useEffect, useRef} from 'react';
import './App.css';
import { // Link, useHref, useParams, BrowserRouter,
          Outlet, useNavigate, useSearchParams, useLocation,
          createSearchParams, Routes, Route, } from "react-router-dom";
import MuiAppBar from "./MuiAppBar";
import { // useMutation, // useQueryClient,
          QueryClient, useQuery, useQueries, QueryClientProvider, } from '@tanstack/react-query'
import axios from "axios";
import {ConceptSetsPage, CsetComparisonPage} from "./Csets";
import {get} from "lodash";
const API_ROOT = 'http://127.0.0.1:8000'
// const enclave_url = path => `${API_ROOT}/passthru?path=${path}`
const backend_url = path => `${API_ROOT}/${path}`

/*
  TODO: I've got some bad state stuff going on. Maybe violating this principle:
  For example, one rule is that you should not mutate an existing state object or ref object. Doing so
  may lead to unexpected behavior such as not triggering re-renders, triggering too many re-renders, and
  triggering partial re-renders (meaning some components re-render while others don't when they should).
    -- Kato, Daishi. Micro State Management with React Hooks (p. 32). Packt Publishing. Kindle Edition.
 */
const queryClient = new QueryClient({   // fixes constant refetch
    // https://tanstack.com/query/v4/docs/guides/window-focus-refetching
    defaultOptions: { queries: { refetchOnWindowFocus: false, }, }, })

/* structure is:
    <BrowserRouter>                     // from index.js root.render
        <QCProvider>                    // all descendent components will be able to call useQuery
            <QueryStringStateMgr>       // gets state (codeset_ids for now) from query string, passes down through props
                <DataContainer>         // fetches data from cr-hierarchy
                    <CsetsRoutes>       // where routes are defined (used to be directly in BrowserRouter in index.js
                        <App>           // all routes start with App
                            <Outlet/>   // this is where route content goes, all the other components
                        </App>
                    </CsetsRoutes>
                </DataContainer>
            <QueryStringStateMgr>
        </QCProvider />
    </BrowserRouter>
*/
function QCProvider() {
  return (
      <QueryClientProvider client={queryClient}>
        <QueryStringStateMgr/>
      </QueryClientProvider>
  );
}
function QueryStringStateMgr() {
  // gets state (codeset_ids for now) from query string, passes down through props
  const location = useLocation();
  const navigate = useNavigate();

  const [searchParams, /* setSearchParams */] = useSearchParams();
  const [props, setProps] = useState({});
  const qsKeys = Array.from(new Set(searchParams.keys()));
  let searchParamsAsObject = {};
  qsKeys.forEach(key => {
    let vals = searchParams.getAll(key);
    searchParamsAsObject[key] = vals.map(v => parseInt(v) == v ? parseInt(v) : v).sort();
  });

  // const [codeset_ids, setCodeset_ids] = useState(searchParamsAsObject.codeset_id || []);

  useEffect(() => {
    if (location.pathname == '/') {
      navigate('/OMOPConceptSets');
      return;
    }
    if (location.pathname == '/testing') {
      const test_codeset_ids = [400614256, 411456218, 419757429, 484619125, 818292046, 826535586];
      let params = createSearchParams({codeset_id: test_codeset_ids});
      navigate({
                 pathname: '/cset-comparison',
                 search: `?${params}`,
               });
    }

    // setCodeset_ids(searchParamsAsObject.codeset_id)

  }, [location]);  // maybe not necessary to have location in dependencies
  const codeset_ids = searchParamsAsObject.codeset_id || [];
  useEffect(() => {
    let props = { dataRequests: [ {url: backend_url('get-all-csets'), dataName:'all_csets'}, ]}
    props.dataRequests.push()
    if (codeset_ids && codeset_ids.length) {
      props.codeset_ids = codeset_ids;
      props.dataRequests.push({ url: backend_url('cr-hierarchy?rec_format=flat&codeset_id=' + codeset_ids.join('|')),
                                dataName:'cset_data'})
    }
    props.dataRequests.forEach(r => console.log(r.url))
    setProps(props);
  }, [codeset_ids.join(',')])
  return <DataContainer {...props} />
}
function DataContainer(props) {
  console.log(props);
  let {codeset_ids=[], dataRequests=[], } = props;
  // const requests = useDataRequests(dataRequests);
  const results = useQueries({
                               queries: dataRequests.map(
                                   req => ({
                                     queryKey: ['query', req.dataName],
                                     queryFn: () => axios.get(req.url),
                                     staleTime: Infinity
                                   })
                               )
                             })
  useEffect(() => {
    if (results.length > 1 && results[1].isFetched) {
      results[1].refetch();
    }
  }, [codeset_ids.join(',')])
  if (!dataRequests.length ) {
    return <RoutesContainer />
  }

  const data = dataRequests.map(
      (req,i) => ({
        ...req,
        status: results[i].status,
        data: get(get(results[i], 'data'), 'data'),
      }))
  let p = {};
  data.forEach(req => { p[req.dataName] = req.data })

  return  <RoutesContainer codeset_ids={codeset_ids} results={results} {...p} />
}
/*
function useDataRequests(dataRequests) {
  const [requests, setRequests] = useState([]);
  for (const _req of dataRequests) {
    let req = {..._req};

    // const { isLoading, error, data, isFetching } = useQuery req.url], () =>
    const queryStateStuff = useQuery([req.url], () => {
      // console.log('getting it');
      const get = axios.get(req.url).then((res) => {
        // console.log('got something')
        return req[req.dataName] = res.data;
      })
      // console.log(`getting ${url}`, get);
      return req['get'] = get;
    });
    setRequests({...req, ...queryStateStuff});
    /*
    let msg =
        (isLoading && <p>Loading from {url}...</p>) ||
        (error && <p>An error has occurred with {url}: {error.stack}</p>) ||
        (isFetching && <p>Updating from {url}...</p>);
     * /
  }
  return requests;
}
*/
function RoutesContainer(props) {
  console.log(props)
  return (
      <Routes>
        <Route path="/" element={<App {...props} />}>
          {/*<Route path="ontocall" element={<EnclaveOntoAPI />} />*/}
          <Route path="cset-comparison" element={<CsetComparisonPage {...props} />} />
          {/* <Route path="cset-comparison/:conceptId" element={<ConceptSet />} /> */}
          <Route path="OMOPConceptSets" element={<ConceptSetsPage {...props}  />} />
          <Route path="about" element={<AboutPage />} />
          {/* <Route path="testing" element={<ConceptSetsPage codeset_ids={test_codeset_ids}/>} /> */}
          {/* <Route path="OMOPConceptSet/:conceptId" element={<OldConceptSet />} /> */}
          <Route path="*"  element={<ErrorPath/>} />
        </Route>
      </Routes>
  )
}
function App() {
  return (
      <div className="App">
        {/* <ReactQueryDevtools initialIsOpen={false} /> */ }
        <MuiAppBar/>
        {/* Outlet: Will render the results of whatever nested route has been clicked/activated. */}
        <Outlet/>
      </div>
  );
}

function ErrorPath() {
  return <h3>Unknown path</h3>
}


// console.log(axios)
// import logo from './logo.svg';
// import Box from '@mui/joy/Box';
/*
when in doubt: https://reactjs.org/docs/hooks-reference.html and https://reactrouter.com/docs/en/v6

just found this: https://betterprogramming.pub/why-you-should-be-separating-your-server-cache-from-your-ui-state-1585a9ae8336
All the stuff below was from trying to find a solution to fetching data and using it across components

https://reactjs.org/docs/hooks-reference.html#useref
  React guarantees that setState function identity is stable and won’t change on re-renders.
  This is why it’s safe to omit from the useEffect or useCallback dependency list.

cool: https://reactjs.org/docs/hooks-reference.html#useref
  If the new state is computed using the previous state, you can pass
  a function to setState.The function will receive the previous
  value, and return an updated value.
     const [count, setCount] = useState(initialCount);
     <button onClick={() => setCount(initialCount)}>Reset</button>           // set with static value
     <button onClick={() => setCount(prevCount => prevCount - 1)}>-</button> // set with function

https://reactjs.org/docs/hooks-reference.html#conditionally-firing-an-effect
  The default behavior for effects is to fire the effect after every completed render.
  However, this may be overkill in some cases, like the subscription example from the
    previous section. We don’t need to create a new subscription on every update, only
    if the source prop has changed.... To implement this, pass a second argument to
    useEffect that is the array of values that the effect depends on.
OH!! Does that mean: without a dependency list, the useEffects function will run on every render?

*/

/*
function objectTypesData(data) {
  const someObjTypePropertiesHaveDesc = data.some(d=>Object.entries(d.properties).some(d=>d.description))
  // console.log(data.map(d=>Object.entries(d.properties).map(p=>`${p[0]}(${p[1].baseType})`).join(', ')).join('\n\n'))
  if (someObjTypePropertiesHaveDesc) {
    console.log('someObjTypePropertiesHaveDesc!!!!!')
  }
  let rows = data.map(d => ({
    apiName: d.apiName,
    description: d.description,
    primaryKey: d.primaryKey.join(','),
    properties: Object.keys(d.properties).join(', '),
  }))
  return rows
}
*/

function AboutPage() {
  return (
      <div>
        <p>TermHub is terminology management heaven.</p>
      </div>
  );
}


export {QCProvider, AboutPage, backend_url};

// TODO: @Siggie: Can we remove this comment or we need this list of links for ref still?
//       @Joe: we should move it to the individual concept set display component(s) as a
//             list of all the data we could be including
/*
function getObjLinks() {
  // https://www.palantir.com/docs/foundry/api/ontology-resources/objects/list-linked-objects
  return <List>

    omop-concept-set-to-omop-concept
    omop-concept-set-version-item-to-omop-concept
    omop-concept-set-version-to-cset-version-info
    omop-concept-set-version-to-items
    omop-vocabulary-version-set-container-link
    vocab-version-set-version-link

    concept-change-version-link
    concept-set-bundle-item-omop-concept-set
    concept-set-review-concept-set
    concept-set-tag-to-concept-set-versions
    concept-set-version-change-acknowledgement-omop-concept-set
    concept-set-version-to-concept-set-container
    documentation-node-to-concept-set-version

    omop-concept-set-provenance
    omop-concept-set-container-omop-concept-domains
    omop-concept-set-to-omop-concept-domains
    omop-concept-set-container-to-concept-set-tag
    omop-concept-set-container-to-research-project
    omop-concept-set-to-research-project

    omop-concept-set-version-to-intended-domain-team
    set-ack-link
    concept-change-subscription
  </List>
}
*/
