import React, {/* useState, useEffect, useMemo, useReducer, useRef, */} from 'react';
// import { createSearchParams, useSearchParams, } from "react-router-dom";
import DataTable, { createTheme } from 'react-data-table-component';
import { AddCircle, RemoveCircleOutline, Add, } from '@mui/icons-material';
// import {Checkbox} from "@mui/material";
import {isEmpty, } from 'lodash'; // set, map, omit, pick, uniq, reduce, cloneDeepWith, isEqual, uniqWith, groupBy,
import {fmt, } from "./utils";
import {ConceptSetCard} from "./ConceptSetCard";
// import {Tooltip} from './Tooltip';
import { getEditCodesetFunc, getCodesetEditActionFunc, ItemOptions, EditInfo, } from './EditCset';
// import {isEmpty} from "react-data-table-component/dist/src/DataTable/util"; // what was this for?
// import Button from '@mui/material/Button';

function ComparisonDataTable(props) {
    console.log(props);
    const {editCodesetId, displayData={}, squishTo, cset_data, csetEditState={}, searchParams, setSearchParams, } = props;
    const {researchers, conceptLookup, } = cset_data;
    // const [columns, setColumns] = useState();
    // const [editInfo, setEditInfo] = useState({});

    const editAction = getCodesetEditActionFunc({searchParams, setSearchParams});
    const editCodesetFunc = getEditCodesetFunc({searchParams, setSearchParams});

    let sizes = {
        rowFontSize:  (13 * squishTo) + 'px',
        // rowPadding:   ( 1 * squishTo) + 'px', // do these do anything?
        // rowPaddingTop:   ( 4 * squishTo) + 'px',
        // rowPaddingBottom:   ( 0 * squishTo) + 'px',
        collapseIcon: (13 * squishTo) + 'px',
        linkHeight:   (20 * squishTo) + 'px',
        atlasHeight:  (12 * squishTo) + 'px',
        athenaHeight: (10 * squishTo) + 'px',
    }
    /*
    useEffect(() => {
        // console.log('setColumns because', {rowData});
        if (isEmpty(displayData.rowData)) {
            return;
        }
        setColumns(colConfig({
                                 displayData, codeset_ids, selected_csets, conceptLookup, csmiLookup,
                                 collapsed, toggleCollapse, sizes,
                                 editCodesetId,
                             }));
    }, [displayData, squishTo, editCodesetId, editInfo, codeset_ids, selected_csets, conceptLookup, csmiLookup,
                collapsed, toggleCollapse, sizes, ]);
     */
    let columns = colConfig({...props, editAction, editCodesetFunc, sizes, displayData, });

    let card, eInfo;
    if (editCodesetId && columns) {
        card = <ConceptSetCard cset={columns.find(d=>d.codeset_id===editCodesetId).cset_col}
                               researchers={researchers}
                               editing={true}
                               width={window.innerWidth * 0.5}
                    />;
    }
    // console.log({editInfo});
    if (! isEmpty(csetEditState)) {
        eInfo = <EditInfo {...props} />;
    }
    const customStyles = styles(sizes);
    const conditionalRowStyles = [
        {
            when: () => true,
            style: row => ({
                backgroundColor: row.concept_id in csetEditState ? '#F662' : '#FFF',
            }),
        },
    ]
    return (
        /* https://react-data-table-component.netlify.app/ */
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'row', margin: '20px', }}>
                {eInfo}
            </div>
            <DataTable
                customStyles={customStyles}
                conditionalRowStyles={conditionalRowStyles}
                className="comparison-data-table"
                theme="custom-theme" // theme="light"
                columns={columns}
                data={displayData.rowData}
                dense
                fixedHeader
                fixedHeaderScrollHeight={(window.innerHeight - 275) + 'px'}
                highlightOnHover
                responsive
                subHeaderAlign="right"
                subHeaderWrap
                //striped //pagination //selectableRowsComponent={Checkbox}
                //selectableRowsComponentProps={selectProps} //sortIcon={sortIcon}
                // expandOnRowClicked // expandableRows // {...props}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'row', margin: '20px', }}>
                { card }
            </div>
        </div>
    );
}

function colConfig(props) {
    let { displayData, selected_csets, cset_data, collapsed, toggleCollapse, sizes,
          editAction, editCodesetFunc, } = props;
    const { csmiLookup, } = cset_data;

    if (!displayData) {
        return;
    }

    let coldefs = [
        {
            name: 'Concept name',
            selector: row => row.concept_name,
            format: (row, ) => {
                let content = displayData.nested
                    ? row.has_children
                        ? collapsed[row.pathToRoot]
                            ? <span className="toggle-collapse" onClick={() => toggleCollapse(row)}><AddCircle sx={{fontSize:sizes.collapseIcon}}/> {row.concept_name} {row.collapsed && 'collapsed'}</span>
                            : <span className="toggle-collapse" onClick={() => toggleCollapse(row)}><RemoveCircleOutline sx={{fontSize:sizes.collapseIcon}}/> {row.concept_name} {row.collapsed && 'collapsed'}</span>
                        : <span><RemoveCircleOutline sx={{fontSize:sizes.collapseIcon, visibility:'hidden'}}/> {row.concept_name}</span>
                    : row.concept_name
                return content;
            },
            sortable: !displayData.nested,
            width: (window.innerWidth - selected_csets.length * 50) * .85,
            wrap: true,
            compact: true,
            conditionalCellStyles: [
                { when: row => true,
                    style: row => ({paddingLeft: 16 + row.level * 16 + 'px'})
                }
            ],
        },
        {
            name: 'Concept ID',
            selector: row => row.concept_id,
            sortable: !displayData.nested,
            width: '80px',
            style: { paddingRight: '8px', },
        },
        {
            name: 'Concept links',
            selector: row => row.concept_id,
            format: row => (
                <span style={{backgroundColor: 'lightgray', height: sizes.linkHeight}} >
                    <a href={`https://atlas-demo.ohdsi.org/#/concept/${row.concept_id}`} target="_blank" rel="noreferrer">
                        <img height={sizes.atlasHeight} src="atlas.ico" alt="Link to this concept in ATLAS"/>
                    </a>&nbsp;
                    <a href={`https://athena.ohdsi.org/search-terms/terms/${row.concept_id}`} target="_blank" rel="noreferrer">
                        <img height={sizes.athenaHeight} src="athena.ico" alt="Link to this concept in Athena"/>
                    </a>
                </span>),
            sortable: !displayData.nested,
            width: '29px',
            style: { paddingRight: '0px', },
        },
        {
            name: 'Patients',
            selector: row => parseInt(row.distinct_person_cnt),
            format: row => fmt(row.distinct_person_cnt),
            sortable: !displayData.nested,
            right: true,
            width: '80px',
            style: { paddingRight: '8px', },
        },
        {
            name: 'Records',
            selector: row => row.total_cnt,
            format: row => fmt(row.total_cnt),
            sortable: !displayData.nested,
            right: true,
            width: '80px',
            style: { paddingRight: '8px', },
        },
    ];
    let cset_cols = selected_csets.map((cset_col) => {
        let def = {
            cset_col,
            codeset_id: cset_col.codeset_id,
            name: <span className="cset-column"
                        onClick={editCodesetFunc}
                        codeset_id={cset_col.codeset_id}
                    >{cset_col.concept_set_version_title}</span>,
            //  name:   <Tooltip label="Click to edit." placement="bottom">
            //              <span>{cset_col.concept_set_version_title}</span>
            //          </Tooltip>,
            selector: (row) => {
                // return 'x';
                return <CellCheckbox { ...props}
                                     {...{row, cset_col,
                                        rowData: displayData.rowData,
                                        editAction}} />;
            },
            conditionalCellStyles: [
                {
                    when: row => csmiLookup[cset_col.codeset_id][row.concept_id],
                    // when: row => row.checkboxes && row.checkboxes[cset_col.codeset_id],
                    style: row => {
                        // return { backgroundColor: 'red', };
                        let mi = csmiLookup[cset_col.codeset_id][row.concept_id];
                        // let mi = row.checkboxes[cset_col.codeset_id];
                        let bg = 'purple';
                        if      (mi.csm && mi.item) { bg = 'orange' }
                        else if (mi.csm)             { bg = 'pink' }
                        else if (mi.item)            { bg = 'gray' }
                        return { backgroundColor: bg, };
                    }
                },
            ],
            sortable: !displayData.nested,
            compact: true,
            width: '50px',
            // maxWidth: 50,
            center: true,
        }
        return def;
    });
    coldefs = [...coldefs, ...cset_cols];
    if (!displayData.nested) {
        delete coldefs[0].conditionalCellStyles;
    }
    return coldefs;
    // console.log('done setting coldefs');

}
/*
trying to figure out what to display to convey relationships between expression items and descendants and other
related concepts -- mapped and excluded
 */
function CellCheckbox(props) {
    const {cset_data, row, cset_col, editCodesetId, editAction, } = props;
    const { csmiLookup, } = cset_data;
    let mi = csmiLookup[cset_col.codeset_id][row.concept_id];
    // should get from csetEditState and, if not there, then csmiLookup

    let checked, contents;
    checked = !! mi;

    if (editCodesetId && cset_col.codeset_id === editCodesetId) {
        if (!mi) {
            contents = <Add onClick={()=>editAction({...props, codeset_id: cset_col.codeset_id, concept_id: row.concept_id, action: 'Add'})}/>
        } else {
            return <ItemOptions item={mi} editing={true}/>;
        }
        /*
        if (row.concept_id in csetEditState) { // should be keyed by codeset_id,concept_id, right?
            checked = ! checked;
        }
        contents = <Checkbox checked={checked} onChange={editAction(cset_col.codeset_id, row.concept_id)}/>
         */
    } else {
        contents = <span>{checked ? '\u2713' : ''}</span>;
    }
    if (mi) {
        return <ItemOptions item={mi}/>;
        // return  <Tooltip label={<pre>{JSON.stringify(mi, null, 2)}</pre>} placement="bottom">{contents}</Tooltip>
    } else {
        return contents
    }
}
// createTheme creates a new theme named solarized that overrides the build in dark theme
// https://github.com/jbetancur/react-data-table-component/blob/master/src/DataTable/themes.ts
createTheme('custom-theme', {
    text: {
        primary: '#268bd2',
        secondary: '#2aa198',
    },
    context: {
        background: '#cb4b16',
        text: '#FFFFFF',
    },
}, 'light');

function styles(sizes) {
    return {
        /*
        	tableWrapper: {
            style: {
              display: 'table',
            },
          },
        denseStyle: {
            minHeight: '2px',
        },
        */
        table: {
            style: {
                maxWidth: '85%',
                marginLeft: '20px',
                // maxWidth: '400px', doesn't work ?
            }
        },
        headCells: {
            style: {
                // transform: 'translate(10px,-15px) rotate(-45deg)',
                // transform: 'translate(0px,30px)',
                // height: '100%',
                // position: 'absolute',
                fontSize: '120%',
                overflow: 'visible',
                verticalAlign: 'bottom', // doesn't work
                marginTop: 'auto',
                padding: 0,
                // border: '3px solid green',
                // paddingLeft: '8px', // override the cell padding for head cells
                // paddingRight: '8px',
            },
        },
        rows: {
            style: {
                color: 'black',
                minHeight: '0px', // override the row height    -- doesn't work, can only seem to do it from css
                padding: sizes.rowPadding,
                fontSize: sizes.rowFontSize,
                // height: '2px',
                // fontSize: '2px',
                // height: '3px',
                borderLeft: '0.5px solid #BBB',
            },
        },
        cells: {
            style: {
                minHeight: '0px', // override the row height
                // paddingLeft: '8px', // override the cell padding for data cells
                // paddingRight: '8px',
                padding: 0, //'0px 5px 0px 5px',
                borderRight: '0.5px solid #BBB',
            },
        },
    };
}
// const expandIcon    = <svg fill="currentColor" height="20" viewBox="0 -6 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"></path><path d="M0-.25h24v24H0z" fill="none"></path></svg>
// const collapseIcon  = <svg fill="currentColor" height="20" viewBox="0 -6 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7.41 7.84L12 12.42l4.59-4.58L18 9.25l-6 6-6-6z"></path><path d="M0-.75h24v24H0z" fill="none"></path></svg>
// const blankIcon     = <svg fill="currentColor" height="20" viewBox="0 -6 24 24" width="24" xmlns="http://www.w3.org/2000/svg" />
export {ComparisonDataTable};


/*
from https://react-data-table-component.netlify.app/?path=/docs/getting-started-kitchen-sink--kitchen-sink
<KitchenSinkStory
  dense
  direction="auto"
  fixedHeader
  fixedHeaderScrollHeight="300px"
  highlightOnHover
  responsive
  striped
  subHeaderAlign="right"
  subHeaderWrap
/>
 */